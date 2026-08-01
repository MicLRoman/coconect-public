export type FormDataProps = {
    basic_info: { name: string; age: string; city: string; neighborhood: string; languages: string[]; };
    gives: {
        education: string;
        experience_level: string[];
        industry: string[];
        hard_skills: string[];
        current_status: { type: string; company_name: string; stage: string; };
        work_style: { pace: number; social_battery: string; };
    };
    asks: { custom_request_raw: string; };
};

export const INITIAL_FORM_DATA: FormDataProps = {
    basic_info: { name: "", age: "", city: "", neighborhood: "", languages: [] },
    gives: {
        education: "", experience_level: [], industry: [], hard_skills: [],
        current_status: { type: "", company_name: "", stage: "" },
        work_style: { pace: 5, social_battery: "" }
    },
    asks: { custom_request_raw: "" }
};