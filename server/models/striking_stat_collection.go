package models

type StrikingStats struct {
	Date        string `json:"date"`
	Opponent    string `json:"opponent"`
	Event       string `json:"event"`
	Result      string `json:"result"`
	SDblA       string `json:"sdbl_a"`  // Significant Distance Blows Landed/Attempted
	SDhlA       string `json:"sdhl_a"`  // Significant Head Blows Landed/Attempted
	SDllA       string `json:"sdll_a"`  // Significant Leg Blows Landed/Attempted
	TSL         string `json:"tsl"`     // Total Strikes Landed
	TSA         string `json:"tsa"`     // Total Strikes Attempted
	SSL         string `json:"ssl"`     // Significant Strikes Landed
	SSA         string `json:"ssa"`     // Significant Strikes Attempted
	TSL_TSA     string `json:"tsl_tsa"` // Total Strikes Landed/Attempted
	KD          string `json:"kd"`      // Knockdowns
	PercentBody string `json:"percent_body"`
	PercentHead string `json:"percent_head"`
	PercentLeg  string `json:"percent_leg"`
}
