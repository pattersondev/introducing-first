package models

type Fighter struct {
	FighterID     int
	Name          string
	Nickname      string
	DivisionTitle string
	Status        string
	Hometown      string
	OctagonDebut  string
	ImageLink     string
	Girth         string
	Stance        string
	FightingStyle string
	Gym           string
	Age           int
	Height        float64
	Weight        float64
	Reach         float64
	LegReach      float64
}

func NewFighter(fighterID int, name string, nickname string, divisionTitle string, status string, hometown string, octagonDebut string, imageLink string, girth string, stance string, fightingStyle string, gym string, age int, height float64, weight float64, reach float64, legReach float64) Fighter {
	return Fighter{
		FighterID:     fighterID,
		Name:          name,
		Nickname:      nickname,
		DivisionTitle: divisionTitle,
		Status:        status,
		Hometown:      hometown,
		OctagonDebut:  octagonDebut,
		ImageLink:     imageLink,
		Girth:         girth,
		Stance:        stance,
		FightingStyle: fightingStyle,
		Gym:           gym,
		Age:           age,
		Height:        height,
		Weight:        weight,
		Reach:         reach,
		LegReach:      legReach,
	}
}
