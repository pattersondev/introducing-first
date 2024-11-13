export interface Fighter {
    fighter_id: string;
    first_name: string;
    last_name: string;
    height_and_weight: string;
    birthdate: string;
    team: string;
    nickname: string;
    stance: string;
    win_loss_record: string;
    tko_record: string;
    sub_record: string;
    image_url: string;
}

export interface Matchup {
    matchup_id: string;
    event_id: string;
    fighter1_id: string;
    fighter2_id: string;
    result: string;
    winner: string;
}

export interface StrikingStats {
    stat_id: string;
    fighter_id: string;
    date: string;
    opponent: string;
    event: string;
    result: string;
    sdbl_a: string;
    sdhl_a: string;
    sdll_a: string;
    tsl: string;
    tsa: string;
    ssl: string;
    ssa: string;
    tsl_tsa: string;
    kd: string;
    percent_body: string;
    percent_head: string;
    percent_leg: string;
}

export interface GroundStats {
    stat_id: string;
    fighter_id: string;
    date: string;
    opponent: string;
    event: string;
    result: string;
    sgbl: string;
    sgba: string;
    sghl: string;
    sgha: string;
    sgll: string;
    sgla: string;
    ad: string;
    adtb: string;
    adhg: string;
    adtm: string;
    adts: string;
    sm: string;
}

export interface ClinchStats {
    stat_id: string;
    fighter_id: string;
    date: string;
    opponent: string;
    event: string;
    result: string;
    scbl: string;
    scba: string;
    schl: string;
    scha: string;
    scll: string;
    scla: string;
    rv: string;
    sr: string;
    tdl: string;
    tda: string;
    tds: string;
    tk_acc: string;
}

export interface Fight {
    fight_id: string;
    matchup_id: string;
    fighter_id: string;
    date: string;
    opponent: string;
    event: string;
    result: string;
    decision: string;
    rnd: string;
    time: string;
} 