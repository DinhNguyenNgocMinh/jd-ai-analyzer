from typing import Optional

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    content: str = Field(
        min_length=10,
        max_length=50_000,
        description="A public job-description URL or pasted job-description text.",
    )


class Tool(BaseModel):
    name: str = Field(description="A concrete tool, platform, language, or technology.")
    importance: int = Field(
        ge=1,
        le=100,
        description="Relative emphasis within this particular job description.",
    )


class JobAnalysis(BaseModel):
    is_job_description: bool = Field(
        description="Whether the source appears to describe a specific role or position."
    )
    job_title: str = Field(
        description="The title stated or strongly supported by the job description."
    )
    summary: str = Field(description="One concise sentence summarizing the role.")
    tools: list[Tool] = Field(
        default_factory=list,
        description="Up to ten supported tools or technologies, sorted by importance.",
    )
    concepts: list[str] = Field(
        default_factory=list,
        description="Up to ten supported knowledge areas, not product or technology names.",
    )
    experience_level: Optional[str] = Field(
        default=None,
        description="Experience or seniority only when explicitly stated or strongly supported.",
    )
    employment_type: Optional[str] = Field(
        default=None,
        description="Employment type such as Full-time, only when stated.",
    )
    work_arrangement: Optional[str] = Field(
        default=None,
        description="Remote, Hybrid, On-site, or null if not stated.",
    )
    key_responsibilities: list[str] = Field(
        default_factory=list,
        description="Up to four concise responsibilities supported by the source.",
    )
    reason_not_job_description: Optional[str] = Field(
        default=None,
        description="A short, clear reason when is_job_description is false.",
    )
