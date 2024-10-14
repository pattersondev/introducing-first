package models

type FightData struct {
	Fighter1 string `json:"Fighter1"`
	Fighter2 string `json:"Fighter2"`
	Result   string `json:"Result"`
	Winner   string `json:"Winner"`
}
