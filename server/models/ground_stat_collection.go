package models

type GroundStats struct {
	Date     string `json:"date"`
	Opponent string `json:"opponent"`
	Event    string `json:"event"`
	Result   string `json:"result"`
	SGBL     string `json:"sgbl"` // Significant Ground Body Strikes Landed/
	SGBA     string `json:"sgba"` // Significant Ground Body Strikes Attempted
	SGHL     string `json:"sghl"` // Significant Ground Head Strikes Landed
	SGHA     string `json:"sgha"` // Significant Ground Head Strikes Attempted
	SGLL     string `json:"sgll"` // Significant Ground Leg Strikes Landed
	SGLA     string `json:"sgla"` // Significant Ground Leg Strikes Attempted
	AD       string `json:"ad"`   // Advances
	ADTB     string `json:"adtb"` // Advance to back
	ADHG     string `json:"adhg"` // Advance to half guard
	ADTM     string `json:"adtm"` // Advance to mount
	ADTS     string `json:"adts"` // Advance to side control
	SM       string `json:"sm"`   // Submissions
}
