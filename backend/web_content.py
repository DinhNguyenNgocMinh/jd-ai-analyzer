import ipaddress
import socket
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter

MAX_PAGE_BYTES = 1_000_000
MAX_EXTRACTED_CHARACTERS = 30_000
MAX_REDIRECTS = 3
REQUEST_TIMEOUT = (5, 15)


class UrlFetchError(Exception):
    """A safe, user-friendly failure while loading a job-description page."""


def looks_like_url(value: str) -> bool:
    parsed = urlparse(value.strip())
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _public_addresses(hostname: str) -> list[str]:
    """Resolve a hostname only when every returned address is globally routable."""
    if hostname.lower() in {"localhost", "localhost.localdomain"}:
        return []

    try:
        addresses = socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM)
    except OSError:
        return []

    resolved = list(dict.fromkeys(address[4][0] for address in addresses))
    for address in resolved:
        ip = ipaddress.ip_address(address)
        if not ip.is_global:
            return []
    return resolved


def _is_public_host(hostname: str) -> bool:
    """Reject local and private network targets before making a request."""
    return bool(_public_addresses(hostname))


class PublicAddressAdapter(HTTPAdapter):
    """Connect to a validated IP address while preserving the original Host and TLS name."""

    def get_connection_with_tls_context(self, request, verify, proxies=None, cert=None):
        parsed = urlparse(request.url)
        hostname = parsed.hostname
        if not hostname:
            raise requests.exceptions.InvalidURL("The request URL has no hostname.")

        addresses = _public_addresses(hostname)
        if not addresses:
            raise requests.exceptions.InvalidURL("The request URL does not resolve to a public address.")

        host_params, pool_kwargs = self.build_connection_pool_key_attributes(request, verify, cert)
        host_params["host"] = addresses[0]
        if parsed.scheme == "https":
            pool_kwargs["assert_hostname"] = hostname
            pool_kwargs["server_hostname"] = hostname
        return self.poolmanager.connection_from_host(**host_params, pool_kwargs=pool_kwargs)

    def add_headers(self, request, **kwargs):
        parsed = urlparse(request.url)
        if not parsed.hostname:
            return

        hostname = parsed.hostname
        if ":" in hostname:
            hostname = f"[{hostname}]"
        default_port = 443 if parsed.scheme == "https" else 80
        if parsed.port and parsed.port != default_port:
            hostname = f"{hostname}:{parsed.port}"
        request.headers.setdefault("Host", hostname)


def _validate_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise UrlFetchError("Please provide a complete public URL beginning with http:// or https://.")
    if parsed.username or parsed.password or not _is_public_host(parsed.hostname):
        raise UrlFetchError("Please provide a publicly accessible job-description URL.")


def _extract_visible_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for unwanted in soup(["script", "style", "noscript", "svg", "iframe", "nav", "footer"]):
        unwanted.decompose()
    return " ".join(soup.get_text(" ", strip=True).split())[:MAX_EXTRACTED_CHARACTERS]


def _declared_size_exceeds_limit(content_length: str | None) -> bool:
    """Treat malformed size headers as unknown and enforce the streamed-byte limit."""
    if not content_length:
        return False
    try:
        return int(content_length) > MAX_PAGE_BYTES
    except ValueError:
        return False


def fetch_job_description(url: str) -> str:
    """Fetch a small public HTML page and return its readable text."""
    current_url = url.strip()
    headers = {
        "User-Agent": "JD-AI-ANALYZER/1.0 (job-description analysis)",
        "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
    }

    try:
        with requests.Session() as session:
            # Do not route user-controlled URLs through an ambient proxy configuration.
            session.trust_env = False
            session.mount("http://", PublicAddressAdapter())
            session.mount("https://", PublicAddressAdapter())
            for _ in range(MAX_REDIRECTS + 1):
                _validate_url(current_url)
                response = session.get(
                    current_url,
                    headers=headers,
                    timeout=REQUEST_TIMEOUT,
                    allow_redirects=False,
                    stream=True,
                )
                try:
                    if response.is_redirect or response.is_permanent_redirect:
                        location = response.headers.get("Location")
                        if not location:
                            raise UrlFetchError("The job-description URL redirected without a destination.")
                        current_url = urljoin(current_url, location)
                        continue

                    if not response.ok:
                        raise UrlFetchError(
                            "We could not access that URL. Please paste the job description text instead."
                        )

                    content_type = response.headers.get("Content-Type", "").lower()
                    if "html" not in content_type and "text" not in content_type:
                        raise UrlFetchError("That URL does not appear to be a readable job-description page.")

                    if _declared_size_exceeds_limit(response.headers.get("Content-Length")):
                        raise UrlFetchError("That page is too large to analyze. Please paste the job description text instead.")

                    chunks: list[bytes] = []
                    total_bytes = 0
                    for chunk in response.iter_content(chunk_size=16_384):
                        total_bytes += len(chunk)
                        if total_bytes > MAX_PAGE_BYTES:
                            raise UrlFetchError("That page is too large to analyze. Please paste the job description text instead.")
                        chunks.append(chunk)

                    html = b"".join(chunks).decode(response.encoding or "utf-8", errors="replace")
                    page_text = _extract_visible_text(html)
                    if len(page_text) < 120:
                        raise UrlFetchError("We could not find enough readable text at that URL. Please paste the job description instead.")
                    return page_text
                finally:
                    response.close()

    except requests.RequestException as error:
        raise UrlFetchError(
            "We could not access that URL. Please paste the job description text instead."
        ) from error

    raise UrlFetchError("That URL redirected too many times. Please paste the job description text instead.")
