from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class BasicInfo(BaseModel):
    name: str
    age: Optional[int] = None
    city: str
    district: Optional[str] = None
    languages: List[str]
    phone: Optional[str] = None

class CurrentStatus(BaseModel):
    type: str
    company_name: Optional[str] = ""
    stage: Optional[str] = ""

class WorkStyle(BaseModel):
    pace: int
    social_battery: str


class Gives(BaseModel):
    education: str
    experience_level: List[str]
    domains: List[str] = Field(default_factory=list, alias="industry") # Совместимость с фронтом
    hard_skills: List[str]
    current_status: CurrentStatus
    work_style: WorkStyle

    model_config = {"populate_by_name": True}

class Asks(BaseModel):
    intents: List[str] = Field(default_factory=list)
    custom_request_raw: str

class UserProfile(BaseModel):
    basic_info: BasicInfo
    inferred_segment: str = "Startups_Builders"
    gives: Gives
    asks: Asks

class CurrentEventRsvp(BaseModel):
    event_id: str
    energy_level: str
    budget_preference: str

class SmartOnboardingRequest(BaseModel):
    user_id: Optional[str] = None
    phone: Optional[str] = None
    user_profile: UserProfile
    # RSVP опционален: при входе по телефону юзер ещё не выбрал событие.
    current_event_rsvp: Optional[CurrentEventRsvp] = None

class WebStartRequest(BaseModel):
    """Веб-шаг онбординга: имя + телефон + LinkedIn (уже распарсенный профиль)."""
    name: str
    phone: str
    city: Optional[str] = None       # явно с лендинга (приоритетнее города из LinkedIn)
    linkedin_url: Optional[str] = None
    linkedin_profile: Dict[str, Any] = Field(default_factory=dict)
    lang: str = "ru"
    variant: Optional[str] = None    # A/B/C-тест: a=сайт->WA | b=сразу WA | c=всё на сайте


class MatchSearchRequest(BaseModel):
    user_id: str
    event_id: str
    query: Optional[str] = ""

# --- Phone auth (dev-mock SMS) ---
class SendCodeRequest(BaseModel):
    phone: str

class VerifyCodeRequest(BaseModel):
    phone: str
    code: str

# --- Event join with per-step preferences ---
class JoinEventRequest(BaseModel):
    user_id: str
    preferences: Dict[str, Any] = Field(default_factory=dict)
