package models

type Fighter struct {
	FirstName       string          `json:"first_name"`
	LastName        string          `json:"last_name"`
	HeightAndWeight string          `json:"height_and_weight"`
	Birthdate       string          `json:"birthdate"`
	Team            string          `json:"team"`
	Nickname        string          `json:"nickname"`
	Stance          string          `json:"stance"`
	WinLossRecord   string          `json:"win_loss_record"`
	TKORecord       string          `json:"tko_record"`
	SubRecord       string          `json:"sub_record"`
	StrikingStats   []StrikingStats `json:"striking_stats"` // Array of striking stats
	ClinchStats     []ClinchStats   `json:"clinch_stats"`   // Array of clinch stats
	GroundStats     []GroundStats   `json:"ground_stats"`   // Array of ground stats
}
