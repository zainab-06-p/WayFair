package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// RideContract provides functions for managing rides
type RideContract struct {
	contractapi.Contract
}

// User represents a registered user (driver or passenger)
type User struct {
	UserID          string    `json:"userID"`
	PseudoID        string    `json:"pseudoID"` // Hashed public key
	WalletAddress   string    `json:"walletAddress"` // MetaMask wallet address
	Role            string    `json:"role"`     // "driver" or "passenger"
	Email           string    `json:"email"`
	EmailVerified   bool      `json:"emailVerified"`
	IPFSHash        string    `json:"ipfsHash"` // Documents stored on IPFS
	RegistrationDate string   `json:"registrationDate"`
	IsActive        bool      `json:"isActive"`
	IsBlocked       bool      `json:"isBlocked"`
}

// Ride represents a ride offer or booking
type Ride struct {
	RideID          string    `json:"rideID"`
	DriverID        string    `json:"driverID"`
	DriverPseudoID  string    `json:"driverPseudoID"`
	StartLocation   Location  `json:"startLocation"`
	EndLocation     Location  `json:"endLocation"`
	DepartureTime   string    `json:"departureTime"`
	AvailableSeats  int       `json:"availableSeats"`
	PricePerSeat    float64   `json:"pricePerSeat"`
	RideType        string    `json:"rideType"` // "solo" or "carpool"
	Status          string    `json:"status"`   // "created", "started", "completed", "cancelled"
	CreatedAt       string    `json:"createdAt"`
	StartedAt       string    `json:"startedAt"`
	CompletedAt     string    `json:"completedAt"`
	Passengers      []string  `json:"passengers"`
}

// Location represents geographical coordinates
type Location struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Address   string  `json:"address"`
}

// Booking represents a ride booking
type Booking struct {
	BookingID         string  `json:"bookingID"`
	RideID            string  `json:"rideID"`
	PassengerID       string  `json:"passengerID"`
	PassengerPseudoID string  `json:"passengerPseudoID"`
	SeatsBooked       int     `json:"seatsBooked"`
	TotalPrice        float64 `json:"totalPrice"`
	PickupAddress     string  `json:"pickupAddress"`
	PickupLat         float64 `json:"pickupLat"`
	PickupLng         float64 `json:"pickupLng"`
	DropAddress       string  `json:"dropAddress"`
	DropLat           float64 `json:"dropLat"`
	DropLng           float64 `json:"dropLng"`
	Status            string  `json:"status"` // "booked", "started", "completed", "cancelled"
	BookedAt          string  `json:"bookedAt"`
	CancelledAt       string  `json:"cancelledAt"`
}

// Feedback represents a rating/review
type Feedback struct {
	FeedbackID string `json:"feedbackID"`
	RideID     string `json:"rideID"`
	BookingID  string `json:"bookingID"`
	FromUserID string `json:"fromUserID"`
	ToUserID   string `json:"toUserID"`
	Rating     int    `json:"rating"`
	Comment    string `json:"comment"`
	Timestamp  string `json:"timestamp"`
}

// Transaction represents a payment transaction
type Transaction struct {
	TransactionID   string  `json:"transactionID"`
	BookingID       string  `json:"bookingID"`
	RideID          string  `json:"rideID"`
	FromPseudoID    string  `json:"fromPseudoID"`
	ToPseudoID      string  `json:"toPseudoID"`
	Amount          float64 `json:"amount"`
	PaymentMethod   string  `json:"paymentMethod"` // "cash", "upi", "eth"
	ETHTransactionHash string `json:"ethTransactionHash"`
	Status          string  `json:"status"`
	Timestamp       string  `json:"timestamp"`
}

// SOSAlert represents an emergency alert
type SOSAlert struct {
	AlertID         string   `json:"alertID"`
	RideID          string   `json:"rideID"`
	BookingID       string   `json:"bookingID"`
	PassengerID     string   `json:"passengerID"`
	PassengerPseudoID string `json:"passengerPseudoID"`
	Location        Location `json:"location"`
	Timestamp       string   `json:"timestamp"`
	Status          string   `json:"status"` // "active", "resolved"
	ResolvedAt      string   `json:"resolvedAt"`
}

// Sponsorship represents driver sponsorship relationship
type Sponsorship struct {
	SponsorshipID      string `json:"sponsorshipID"`
	SponsorID          string `json:"sponsorID"`
	SponsorPseudoID    string `json:"sponsorPseudoID"`
	SponseeID          string `json:"sponseeID"`
	SponseePseudoID    string `json:"sponseePseudoID"`
	Status             string `json:"status"` // "pending", "active", "completed", "terminated"
	RequestedAt        string `json:"requestedAt"`
	AcceptedAt         string `json:"acceptedAt"`
	ProbationStartDate string `json:"probationStartDate"`
	ProbationEndDate   string `json:"probationEndDate"`
	RewardsClaimed     bool   `json:"rewardsClaimed"`
}

// AccountabilityEvent represents sponsor accountability for sponsee actions
type AccountabilityEvent struct {
	EventID             string  `json:"eventID"`
	SponsorshipID       string  `json:"sponsorshipID"`
	SponseeID           string  `json:"sponseeID"`
	EventType           string  `json:"eventType"` // "positive", "negative"
	Description         string  `json:"description"`
	ImpactOnTrustScore  int     `json:"impactOnTrustScore"`
	ResponsibilityPercent int   `json:"responsibilityPercent"` // 100%, 50%, or 10%
	Timestamp           string  `json:"timestamp"`
}

// TrustScore represents driver trust metrics
type TrustScore struct {
	DriverID            string  `json:"driverID"`
	TrustScore          int     `json:"trustScore"` // 0-1000
	TrustLevel          string  `json:"trustLevel"` // "Restricted", "Bronze", "Silver", "Gold", "Platinum"
	MaxSponsorships     int     `json:"maxSponsorships"`
	ActiveSponsorships  int     `json:"activeSponsorships"`
	TotalSponsored      int     `json:"totalSponsored"`
	SuccessfulSponsors  int     `json:"successfulSponsors"`
	LastUpdated         string  `json:"lastUpdated"`
}

// RegisterUser registers a new user on the blockchain
func (rc *RideContract) RegisterUser(ctx contractapi.TransactionContextInterface, userID string, pseudoID string, role string, email string, ipfsHash string) error {
	exists, err := rc.UserExists(ctx, userID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("user %s already exists", userID)
	}

	user := User{
		UserID:          userID,
		PseudoID:        pseudoID,
		WalletAddress:   "", // Empty for non-wallet users
		Role:            role,
		Email:           email,
		EmailVerified:   false,
		IPFSHash:        ipfsHash,
		RegistrationDate: time.Now().Format(time.RFC3339),
		IsActive:        false, // Activated after email verification
	}

	userJSON, err := json.Marshal(user)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(userID, userJSON)
}

// RegisterWalletUser registers a user with MetaMask wallet
func (rc *RideContract) RegisterWalletUser(ctx contractapi.TransactionContextInterface, userID string, walletAddress string, role string, email string, ipfsHash string) error {
	exists, err := rc.UserExists(ctx, userID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("user %s already exists", userID)
	}

	// Check if wallet already registered
	_, err = rc.GetUserByWallet(ctx, walletAddress)
	if err == nil {
		return fmt.Errorf("wallet %s already registered", walletAddress)
	}

	user := User{
		UserID:          userID,
		PseudoID:        walletAddress, // Use wallet as pseudo ID for wallet users
		WalletAddress:   walletAddress,
		Role:            role,
		Email:           email,
		EmailVerified:   false,
		IPFSHash:        ipfsHash,
		RegistrationDate: time.Now().Format(time.RFC3339),
		IsActive:        false, // Activated after email verification
	}

	userJSON, err := json.Marshal(user)
	if err != nil {
		return err
	}

	// Store user by userID
	err = ctx.GetStub().PutState(userID, userJSON)
	if err != nil {
		return err
	}

	// Create wallet index for quick lookup
	walletKey := fmt.Sprintf("WALLET_%s", walletAddress)
	return ctx.GetStub().PutState(walletKey, []byte(userID))
}

// VerifyUserEmail marks user's email as verified
func (rc *RideContract) VerifyUserEmail(ctx contractapi.TransactionContextInterface, userID string) error {
	userJSON, err := ctx.GetStub().GetState(userID)
	if err != nil {
		return fmt.Errorf("failed to read user: %v", err)
	}
	if userJSON == nil {
		return fmt.Errorf("user %s does not exist", userID)
	}

	var user User
	err = json.Unmarshal(userJSON, &user)
	if err != nil {
		return err
	}

	user.EmailVerified = true
	user.IsActive = true

	userJSON, err = json.Marshal(user)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(userID, userJSON)
}

// CreateRide creates a new ride (driver only)
func (rc *RideContract) CreateRide(ctx contractapi.TransactionContextInterface, rideID string, driverID string, driverPseudoID string, 
	startLat float64, startLng float64, startAddr string,
	endLat float64, endLng float64, endAddr string,
	departureTime string, availableSeats int, pricePerSeat float64, rideType string) error {

	exists, err := rc.RideExists(ctx, rideID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("ride %s already exists", rideID)
	}

	ride := Ride{
		RideID:         rideID,
		DriverID:       driverID,
		DriverPseudoID: driverPseudoID,
		StartLocation: Location{
			Latitude:  startLat,
			Longitude: startLng,
			Address:   startAddr,
		},
		EndLocation: Location{
			Latitude:  endLat,
			Longitude: endLng,
			Address:   endAddr,
		},
		DepartureTime:  departureTime,
		AvailableSeats: availableSeats,
		PricePerSeat:   pricePerSeat,
		RideType:       rideType,
		Status:         "created",
		CreatedAt:      time.Now().Format(time.RFC3339),
		Passengers:     []string{},
	}

	rideJSON, err := json.Marshal(ride)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(rideID, rideJSON)
}

// BookRide books a ride for a passenger
func (rc *RideContract) BookRide(ctx contractapi.TransactionContextInterface, bookingID string, rideID string,
	passengerID string, passengerPseudoID string, seatsBookedStr string,
	pickupLatStr string, pickupLngStr string, pickupAddress string,
	dropLatStr string, dropLngStr string, dropAddress string) error {

	seatsBooked, _ := strconv.Atoi(seatsBookedStr)
	if seatsBooked < 1 {
		seatsBooked = 1
	}
	pickupLat, _ := strconv.ParseFloat(pickupLatStr, 64)
	pickupLng, _ := strconv.ParseFloat(pickupLngStr, 64)
	dropLat, _ := strconv.ParseFloat(dropLatStr, 64)
	dropLng, _ := strconv.ParseFloat(dropLngStr, 64)

	// Get ride details
	rideJSON, err := ctx.GetStub().GetState(rideID)
	if err != nil {
		return fmt.Errorf("failed to read ride: %v", err)
	}
	if rideJSON == nil {
		return fmt.Errorf("ride %s does not exist", rideID)
	}

	var ride Ride
	err = json.Unmarshal(rideJSON, &ride)
	if err != nil {
		return err
	}

	// Check available seats
	if ride.AvailableSeats < seatsBooked {
		return fmt.Errorf("not enough seats available")
	}

	// Create booking
	booking := Booking{
		BookingID:         bookingID,
		RideID:            rideID,
		PassengerID:       passengerID,
		PassengerPseudoID: passengerPseudoID,
		SeatsBooked:       seatsBooked,
		TotalPrice:        ride.PricePerSeat * float64(seatsBooked),
		PickupAddress:     pickupAddress,
		PickupLat:         pickupLat,
		PickupLng:         pickupLng,
		DropAddress:       dropAddress,
		DropLat:           dropLat,
		DropLng:           dropLng,
		Status:            "booked",
		BookedAt:          time.Now().Format(time.RFC3339),
	}

	bookingJSON, err := json.Marshal(booking)
	if err != nil {
		return err
	}

	// Update ride
	ride.AvailableSeats -= seatsBooked
	ride.Passengers = append(ride.Passengers, passengerID)

	rideJSON, err = json.Marshal(ride)
	if err != nil {
		return err
	}

	// Save both
	err = ctx.GetStub().PutState(bookingID, bookingJSON)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(rideID, rideJSON)
}

// StartRide marks a ride as started
func (rc *RideContract) StartRide(ctx contractapi.TransactionContextInterface, rideID string) error {
	rideJSON, err := ctx.GetStub().GetState(rideID)
	if err != nil {
		return fmt.Errorf("failed to read ride: %v", err)
	}
	if rideJSON == nil {
		return fmt.Errorf("ride %s does not exist", rideID)
	}

	var ride Ride
	err = json.Unmarshal(rideJSON, &ride)
	if err != nil {
		return err
	}

	ride.Status = "started"
	ride.StartedAt = time.Now().Format(time.RFC3339)

	rideJSON, err = json.Marshal(ride)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(rideID, rideJSON)
}

// EndRide marks a ride as completed
func (rc *RideContract) EndRide(ctx contractapi.TransactionContextInterface, rideID string) error {
	rideJSON, err := ctx.GetStub().GetState(rideID)
	if err != nil {
		return fmt.Errorf("failed to read ride: %v", err)
	}
	if rideJSON == nil {
		return fmt.Errorf("ride %s does not exist", rideID)
	}

	var ride Ride
	err = json.Unmarshal(rideJSON, &ride)
	if err != nil {
		return err
	}

	ride.Status = "completed"
	ride.CompletedAt = time.Now().Format(time.RFC3339)

	rideJSON, err = json.Marshal(ride)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(rideID, rideJSON)
}

// CancelRide cancels a ride
func (rc *RideContract) CancelRide(ctx contractapi.TransactionContextInterface, rideID string) error {
	rideJSON, err := ctx.GetStub().GetState(rideID)
	if err != nil {
		return fmt.Errorf("failed to read ride: %v", err)
	}
	if rideJSON == nil {
		return fmt.Errorf("ride %s does not exist", rideID)
	}

	var ride Ride
	err = json.Unmarshal(rideJSON, &ride)
	if err != nil {
		return err
	}

	ride.Status = "cancelled"

	rideJSON, err = json.Marshal(ride)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(rideID, rideJSON)
}

// CancelBooking cancels a booking
func (rc *RideContract) CancelBooking(ctx contractapi.TransactionContextInterface, bookingID string) error {
	bookingJSON, err := ctx.GetStub().GetState(bookingID)
	if err != nil {
		return fmt.Errorf("failed to read booking: %v", err)
	}
	if bookingJSON == nil {
		return fmt.Errorf("booking %s does not exist", bookingID)
	}

	var booking Booking
	err = json.Unmarshal(bookingJSON, &booking)
	if err != nil {
		return err
	}

	booking.Status = "cancelled"
	booking.CancelledAt = time.Now().Format(time.RFC3339)

	// Update ride available seats
	rideJSON, err := ctx.GetStub().GetState(booking.RideID)
	if err != nil {
		return fmt.Errorf("failed to read ride: %v", err)
	}

	var ride Ride
	err = json.Unmarshal(rideJSON, &ride)
	if err != nil {
		return err
	}

	ride.AvailableSeats += booking.SeatsBooked

	rideJSON, err = json.Marshal(ride)
	if err != nil {
		return err
	}

	bookingJSON, err = json.Marshal(booking)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(booking.RideID, rideJSON)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(bookingID, bookingJSON)
}

// RecordTransaction records a payment transaction
func (rc *RideContract) RecordTransaction(ctx contractapi.TransactionContextInterface, transactionID string, 
	bookingID string, rideID string, fromPseudoID string, toPseudoID string, 
	amount float64, paymentMethod string, ethTxHash string) error {

	transaction := Transaction{
		TransactionID:      transactionID,
		BookingID:          bookingID,
		RideID:             rideID,
		FromPseudoID:       fromPseudoID,
		ToPseudoID:         toPseudoID,
		Amount:             amount,
		PaymentMethod:      paymentMethod,
		ETHTransactionHash: ethTxHash,
		Status:             "completed",
		Timestamp:          time.Now().Format(time.RFC3339),
	}

	transactionJSON, err := json.Marshal(transaction)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(transactionID, transactionJSON)
}

// TriggerSOS creates an SOS alert
func (rc *RideContract) TriggerSOS(ctx contractapi.TransactionContextInterface, alertID string, 
	rideID string, bookingID string, passengerID string, passengerPseudoID string,
	lat float64, lng float64, addr string) error {

	alert := SOSAlert{
		AlertID:           alertID,
		RideID:            rideID,
		BookingID:         bookingID,
		PassengerID:       passengerID,
		PassengerPseudoID: passengerPseudoID,
		Location: Location{
			Latitude:  lat,
			Longitude: lng,
			Address:   addr,
		},
		Timestamp: time.Now().Format(time.RFC3339),
		Status:    "active",
	}

	alertJSON, err := json.Marshal(alert)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(alertID, alertJSON)
}

// CreateSponsorshipRequest - New driver requests sponsorship
func (rc *RideContract) CreateSponsorshipRequest(ctx contractapi.TransactionContextInterface, 
	sponsorshipID string, sponsorID string, sponsorPseudoID string, 
	sponseeID string, sponseePseudoID string) error {

	// Verify sponsor exists and is a driver
	sponsor, err := rc.GetUser(ctx, sponsorID)
	if err != nil {
		return fmt.Errorf("sponsor not found: %v", err)
	}
	if sponsor.Role != "driver" {
		return fmt.Errorf("sponsor must be a driver")
	}

	// Verify sponsee exists and is a driver
	sponsee, err := rc.GetUser(ctx, sponseeID)
	if err != nil {
		return fmt.Errorf("sponsee not found: %v", err)
	}
	if sponsee.Role != "driver" {
		return fmt.Errorf("sponsee must be a driver")
	}

	// Check sponsor's trust score
	trustScore, err := rc.GetDriverTrustScore(ctx, sponsorID)
	if err != nil {
		return fmt.Errorf("failed to get sponsor trust score: %v", err)
	}

	if trustScore.TrustScore < 400 {
		return fmt.Errorf("sponsor trust score too low (minimum 400 required)")
	}

	if trustScore.ActiveSponsorships >= trustScore.MaxSponsorships {
		return fmt.Errorf("sponsor has reached maximum active sponsorships")
	}

	sponsorship := Sponsorship{
		SponsorshipID:     sponsorshipID,
		SponsorID:         sponsorID,
		SponsorPseudoID:   sponsorPseudoID,
		SponseeID:         sponseeID,
		SponseePseudoID:   sponseePseudoID,
		Status:            "pending",
		RequestedAt:       time.Now().Format(time.RFC3339),
	}

	sponsorshipJSON, err := json.Marshal(sponsorship)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(sponsorshipID, sponsorshipJSON)
}

// AcceptSponsorship - Sponsor accepts the request
func (rc *RideContract) AcceptSponsorship(ctx contractapi.TransactionContextInterface, 
	sponsorshipID string) error {

	sponsorshipJSON, err := ctx.GetStub().GetState(sponsorshipID)
	if err != nil {
		return fmt.Errorf("failed to read sponsorship: %v", err)
	}
	if sponsorshipJSON == nil {
		return fmt.Errorf("sponsorship not found")
	}

	var sponsorship Sponsorship
	err = json.Unmarshal(sponsorshipJSON, &sponsorship)
	if err != nil {
		return err
	}

	if sponsorship.Status != "pending" {
		return fmt.Errorf("sponsorship is not pending")
	}

	now := time.Now()
	sponsorship.Status = "active"
	sponsorship.AcceptedAt = now.Format(time.RFC3339)
	sponsorship.ProbationStartDate = now.Format(time.RFC3339)
	sponsorship.ProbationEndDate = now.AddDate(0, 0, 90).Format(time.RFC3339) // 90 days

	sponsorshipJSON, err = json.Marshal(sponsorship)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(sponsorshipID, sponsorshipJSON)
	if err != nil {
		return err
	}

	// Update sponsor's active sponsorship count
	trustScore, err := rc.GetDriverTrustScore(ctx, sponsorship.SponsorID)
	if err == nil {
		trustScore.ActiveSponsorships++
		trustScore.TotalSponsored++
		trustScoreJSON, _ := json.Marshal(trustScore)
		ctx.GetStub().PutState(fmt.Sprintf("TRUST_%s", sponsorship.SponsorID), trustScoreJSON)
	}

	return nil
}

// RecordAccountabilityEvent - Record sponsee's behavior impact on sponsor
func (rc *RideContract) RecordAccountabilityEvent(ctx contractapi.TransactionContextInterface,
	eventID string, sponsorshipID string, sponseeID string, 
	eventType string, description string, impactScore int) error {

	sponsorshipJSON, err := ctx.GetStub().GetState(sponsorshipID)
	if err != nil {
		return fmt.Errorf("failed to read sponsorship: %v", err)
	}
	if sponsorshipJSON == nil {
		return fmt.Errorf("sponsorship not found")
	}

	var sponsorship Sponsorship
	err = json.Unmarshal(sponsorshipJSON, &sponsorship)
	if err != nil {
		return err
	}

	if sponsorship.Status != "active" {
		return fmt.Errorf("sponsorship is not active")
	}

	// Calculate responsibility percentage based on time elapsed
	probationStart, _ := time.Parse(time.RFC3339, sponsorship.ProbationStartDate)
	now := time.Now()
	daysElapsed := int(now.Sub(probationStart).Hours() / 24)

	var responsibilityPercent int
	if daysElapsed <= 30 {
		responsibilityPercent = 100 // Full responsibility in first 30 days
	} else if daysElapsed <= 90 {
		responsibilityPercent = 50 // 50% responsibility in days 31-90
	} else {
		responsibilityPercent = 10 // 10% legacy responsibility after 90 days
	}

	// Calculate actual impact on sponsor based on responsibility
	actualImpact := (impactScore * responsibilityPercent) / 100

	event := AccountabilityEvent{
		EventID:               eventID,
		SponsorshipID:         sponsorshipID,
		SponseeID:             sponseeID,
		EventType:             eventType,
		Description:           description,
		ImpactOnTrustScore:    actualImpact,
		ResponsibilityPercent: responsibilityPercent,
		Timestamp:             now.Format(time.RFC3339),
	}

	eventJSON, err := json.Marshal(event)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(eventID, eventJSON)
	if err != nil {
		return err
	}

	// Update sponsor's trust score
	trustScore, err := rc.GetDriverTrustScore(ctx, sponsorship.SponsorID)
	if err != nil {
		// Create new trust score if doesn't exist
		trustScore = &TrustScore{
			DriverID:    sponsorship.SponsorID,
			TrustScore:  600, // Default starting score
			LastUpdated: now.Format(time.RFC3339),
		}
	}

	// Apply impact
	if eventType == "positive" {
		trustScore.TrustScore += actualImpact
	} else {
		trustScore.TrustScore -= actualImpact
	}

	// Clamp between 0-1000
	if trustScore.TrustScore < 0 {
		trustScore.TrustScore = 0
	}
	if trustScore.TrustScore > 1000 {
		trustScore.TrustScore = 1000
	}

	// Update trust level
	trustScore.TrustLevel = calculateTrustLevel(trustScore.TrustScore)
	trustScore.MaxSponsorships = calculateMaxSponsorships(trustScore.TrustScore)
	trustScore.LastUpdated = now.Format(time.RFC3339)

	trustScoreJSON, err := json.Marshal(trustScore)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(fmt.Sprintf("TRUST_%s", sponsorship.SponsorID), trustScoreJSON)
}

// CompleteProbation - Mark probation period as complete
func (rc *RideContract) CompleteProbation(ctx contractapi.TransactionContextInterface, 
	sponsorshipID string) error {

	sponsorshipJSON, err := ctx.GetStub().GetState(sponsorshipID)
	if err != nil {
		return fmt.Errorf("failed to read sponsorship: %v", err)
	}
	if sponsorshipJSON == nil {
		return fmt.Errorf("sponsorship not found")
	}

	var sponsorship Sponsorship
	err = json.Unmarshal(sponsorshipJSON, &sponsorship)
	if err != nil {
		return err
	}

	sponsorship.Status = "completed"
	sponsorshipJSON, err = json.Marshal(sponsorship)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(sponsorshipID, sponsorshipJSON)
	if err != nil {
		return err
	}

	// Update sponsor's counts
	trustScore, err := rc.GetDriverTrustScore(ctx, sponsorship.SponsorID)
	if err == nil {
		trustScore.ActiveSponsorships--
		trustScore.SuccessfulSponsors++
		// Reward for successful sponsorship
		trustScore.TrustScore += 50
		if trustScore.TrustScore > 1000 {
			trustScore.TrustScore = 1000
		}
		trustScore.TrustLevel = calculateTrustLevel(trustScore.TrustScore)
		trustScore.MaxSponsorships = calculateMaxSponsorships(trustScore.TrustScore)
		trustScore.LastUpdated = time.Now().Format(time.RFC3339)
		
		trustScoreJSON, _ := json.Marshal(trustScore)
		ctx.GetStub().PutState(fmt.Sprintf("TRUST_%s", sponsorship.SponsorID), trustScoreJSON)
	}

	return nil
}

// Helper functions for trust score calculations
func calculateTrustLevel(score int) string {
	if score >= 900 {
		return "Platinum"
	} else if score >= 800 {
		return "Gold"
	} else if score >= 600 {
		return "Silver"
	} else if score >= 400 {
		return "Bronze"
	}
	return "Restricted"
}

func calculateMaxSponsorships(score int) int {
	if score >= 900 {
		return 5 // Platinum
	} else if score >= 800 {
		return 3 // Gold
	} else if score >= 600 {
		return 2 // Silver
	} else if score >= 400 {
		return 1 // Bronze
	}
	return 0 // Restricted
}

// Query functions

func (rc *RideContract) GetUser(ctx contractapi.TransactionContextInterface, userID string) (*User, error) {
	userJSON, err := ctx.GetStub().GetState(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to read user: %v", err)
	}
	if userJSON == nil {
		return nil, fmt.Errorf("user %s does not exist", userID)
	}

	var user User
	err = json.Unmarshal(userJSON, &user)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

// GetUserByWallet retrieves user by wallet address
func (rc *RideContract) GetUserByWallet(ctx contractapi.TransactionContextInterface, walletAddress string) (*User, error) {
	// Get userID from wallet index
	walletKey := fmt.Sprintf("WALLET_%s", walletAddress)
	userIDBytes, err := ctx.GetStub().GetState(walletKey)
	if err != nil {
		return nil, fmt.Errorf("failed to read wallet index: %v", err)
	}
	if userIDBytes == nil {
		return nil, fmt.Errorf("wallet %s not registered", walletAddress)
	}

	userID := string(userIDBytes)
	return rc.GetUser(ctx, userID)
}

func (rc *RideContract) GetRide(ctx contractapi.TransactionContextInterface, rideID string) (*Ride, error) {
	rideJSON, err := ctx.GetStub().GetState(rideID)
	if err != nil {
		return nil, fmt.Errorf("failed to read ride: %v", err)
	}
	if rideJSON == nil {
		return nil, fmt.Errorf("ride %s does not exist", rideID)
	}

	var ride Ride
	err = json.Unmarshal(rideJSON, &ride)
	if err != nil {
		return nil, err
	}

	return &ride, nil
}

func (rc *RideContract) GetBooking(ctx contractapi.TransactionContextInterface, bookingID string) (*Booking, error) {
	bookingJSON, err := ctx.GetStub().GetState(bookingID)
	if err != nil {
		return nil, fmt.Errorf("failed to read booking: %v", err)
	}
	if bookingJSON == nil {
		return nil, fmt.Errorf("booking %s does not exist", bookingID)
	}

	var booking Booking
	err = json.Unmarshal(bookingJSON, &booking)
	if err != nil {
		return nil, err
	}

	return &booking, nil
}

// Helper functions

func (rc *RideContract) UserExists(ctx contractapi.TransactionContextInterface, userID string) (bool, error) {
	userJSON, err := ctx.GetStub().GetState(userID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return userJSON != nil, nil
}

func (rc *RideContract) RideExists(ctx contractapi.TransactionContextInterface, rideID string) (bool, error) {
	rideJSON, err := ctx.GetStub().GetState(rideID)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return rideJSON != nil, nil
}

// GetAllUsers returns all registered users
func (rc *RideContract) GetAllUsers(ctx contractapi.TransactionContextInterface) ([]*User, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, fmt.Errorf("failed to get state by range: %v", err)
	}
	defer resultsIterator.Close()

	var users []*User
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		// Check if this is a user record
		if len(queryResponse.Key) > 5 && queryResponse.Key[:5] == "USER_" {
			var user User
			err = json.Unmarshal(queryResponse.Value, &user)
			if err != nil {
				continue // Skip invalid records
			}
			users = append(users, &user)
		}
	}

	return users, nil
}

// BlockUser blocks or unblocks a user
func (rc *RideContract) BlockUser(ctx contractapi.TransactionContextInterface, userID string, isBlocked string, reason string) error {
	user, err := rc.GetUser(ctx, userID)
	if err != nil {
		return err
	}

	blocked := isBlocked == "true"
	user.IsBlocked = blocked
	
	userJSON, err := json.Marshal(user)
	if err != nil {
		return fmt.Errorf("failed to marshal user: %v", err)
	}

	return ctx.GetStub().PutState(userID, userJSON)
}

// GetAllRides returns all rides
func (rc *RideContract) GetAllRides(ctx contractapi.TransactionContextInterface) ([]*Ride, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, fmt.Errorf("failed to get state by range: %v", err)
	}
	defer resultsIterator.Close()

	var rides []*Ride
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		// Check if this is a ride record
		if len(queryResponse.Key) > 5 && queryResponse.Key[:5] == "RIDE_" {
			var ride Ride
			err = json.Unmarshal(queryResponse.Value, &ride)
			if err != nil {
				continue // Skip invalid records
			}
			rides = append(rides, &ride)
		}
	}

	return rides, nil
}

// GetDriverTrustScore returns trust score for a driver
func (rc *RideContract) GetDriverTrustScore(ctx contractapi.TransactionContextInterface, driverID string) (*TrustScore, error) {
	trustScoreJSON, err := ctx.GetStub().GetState(fmt.Sprintf("TRUST_%s", driverID))
	if err != nil {
		return nil, fmt.Errorf("failed to read trust score: %v", err)
	}
	
	if trustScoreJSON == nil {
		// Return default trust score for new drivers
		return &TrustScore{
			DriverID:           driverID,
			TrustScore:         600, // Default starting score
			TrustLevel:         "Silver",
			MaxSponsorships:    2,
			ActiveSponsorships: 0,
			TotalSponsored:     0,
			SuccessfulSponsors: 0,
			LastUpdated:        time.Now().Format(time.RFC3339),
		}, nil
	}

	var trustScore TrustScore
	err = json.Unmarshal(trustScoreJSON, &trustScore)
	if err != nil {
		return nil, err
	}

	return &trustScore, nil
}

// GetDriverSponsorships returns all sponsorships for a driver (as sponsor or sponsee)
func (rc *RideContract) GetDriverSponsorships(ctx contractapi.TransactionContextInterface, driverID string) ([]*Sponsorship, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, fmt.Errorf("failed to get state by range: %v", err)
	}
	defer resultsIterator.Close()

	var sponsorships []*Sponsorship
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		// Check if this is a sponsorship record
		if len(queryResponse.Key) > 12 && queryResponse.Key[:12] == "SPONSORSHIP_" {
			var sponsorship Sponsorship
			err = json.Unmarshal(queryResponse.Value, &sponsorship)
			if err != nil {
				continue
			}
			// Include if driver is sponsor or sponsee
			if sponsorship.SponsorID == driverID || sponsorship.SponseeID == driverID {
				sponsorships = append(sponsorships, &sponsorship)
			}
		}
	}

	return sponsorships, nil
}

// GetSOSAlert returns SOS alert details
func (rc *RideContract) GetSOSAlert(ctx contractapi.TransactionContextInterface, alertID string) (*SOSAlert, error) {
	alertJSON, err := ctx.GetStub().GetState(alertID)
	if err != nil {
		return nil, fmt.Errorf("failed to read SOS alert: %v", err)
	}
	if alertJSON == nil {
		return nil, fmt.Errorf("SOS alert %s does not exist", alertID)
	}

	var alert SOSAlert
	err = json.Unmarshal(alertJSON, &alert)
	if err != nil {
		return nil, err
	}

	return &alert, nil
}

// ResolveSOSAlert marks SOS as resolved
func (rc *RideContract) ResolveSOSAlert(ctx contractapi.TransactionContextInterface, alertID string) error {
	alert, err := rc.GetSOSAlert(ctx, alertID)
	if err != nil {
		return err
	}

	alert.Status = "resolved"
	alert.ResolvedAt = time.Now().Format(time.RFC3339)

	alertJSON, err := json.Marshal(alert)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(alertID, alertJSON)
}

// GetAllSOSAlerts returns all SOS alerts
func (rc *RideContract) GetAllSOSAlerts(ctx contractapi.TransactionContextInterface) ([]*SOSAlert, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, fmt.Errorf("failed to get state by range: %v", err)
	}
	defer resultsIterator.Close()

	var alerts []*SOSAlert
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		// Check if this is an SOS alert record
		if len(queryResponse.Key) > 4 && queryResponse.Key[:4] == "SOS_" {
			var alert SOSAlert
			err = json.Unmarshal(queryResponse.Value, &alert)
			if err != nil {
				continue
			}
			alerts = append(alerts, &alert)
		}
	}

	return alerts, nil
}

// GetBookingsByPassenger returns all bookings made by a passenger
func (rc *RideContract) GetBookingsByPassenger(ctx contractapi.TransactionContextInterface, passengerID string) ([]*Booking, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, fmt.Errorf("failed to get state by range: %v", err)
	}
	defer resultsIterator.Close()

	var bookings []*Booking
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		if len(queryResponse.Key) > 8 && queryResponse.Key[:8] == "BOOKING_" {
			var booking Booking
			if err := json.Unmarshal(queryResponse.Value, &booking); err != nil {
				continue
			}
			if booking.PassengerID == passengerID {
				bookings = append(bookings, &booking)
			}
		}
	}
	return bookings, nil
}

// GetRideBookings returns all bookings for a specific ride
func (rc *RideContract) GetRideBookings(ctx contractapi.TransactionContextInterface, rideID string) ([]*Booking, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, fmt.Errorf("failed to get state by range: %v", err)
	}
	defer resultsIterator.Close()

	var bookings []*Booking
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		if len(queryResponse.Key) > 8 && queryResponse.Key[:8] == "BOOKING_" {
			var booking Booking
			if err := json.Unmarshal(queryResponse.Value, &booking); err != nil {
				continue
			}
			if booking.RideID == rideID {
				bookings = append(bookings, &booking)
			}
		}
	}
	return bookings, nil
}

// GetAllBookings returns all bookings
func (rc *RideContract) GetAllBookings(ctx contractapi.TransactionContextInterface) ([]*Booking, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, fmt.Errorf("failed to get state by range: %v", err)
	}
	defer resultsIterator.Close()

	var bookings []*Booking
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		if len(queryResponse.Key) > 8 && queryResponse.Key[:8] == "BOOKING_" {
			var booking Booking
			if err := json.Unmarshal(queryResponse.Value, &booking); err != nil {
				continue
			}
			bookings = append(bookings, &booking)
		}
	}
	return bookings, nil
}

// SubmitFeedback stores a rating and review on-chain
func (rc *RideContract) SubmitFeedback(ctx contractapi.TransactionContextInterface, feedbackID string, rideID string, bookingID string, fromUserID string, toUserID string, ratingStr string, comment string) error {
	rating, err := strconv.Atoi(ratingStr)
	if err != nil || rating < 1 || rating > 5 {
		return fmt.Errorf("invalid rating: must be 1-5")
	}
	feedback := Feedback{
		FeedbackID: feedbackID,
		RideID:     rideID,
		BookingID:  bookingID,
		FromUserID: fromUserID,
		ToUserID:   toUserID,
		Rating:     rating,
		Comment:    comment,
		Timestamp:  time.Now().Format(time.RFC3339),
	}
	feedbackJSON, err := json.Marshal(feedback)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState(feedbackID, feedbackJSON)
}

// GetUserFeedback returns all feedback received by a user
func (rc *RideContract) GetUserFeedback(ctx contractapi.TransactionContextInterface, userID string) ([]*Feedback, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, fmt.Errorf("failed to get state by range: %v", err)
	}
	defer resultsIterator.Close()

	var feedbacks []*Feedback
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		if len(queryResponse.Key) > 9 && queryResponse.Key[:9] == "FEEDBACK_" {
			var fb Feedback
			if err := json.Unmarshal(queryResponse.Value, &fb); err != nil {
				continue
			}
			if fb.ToUserID == userID {
				feedbacks = append(feedbacks, &fb)
			}
		}
	}
	return feedbacks, nil
}

// GetRideFeedback returns all feedback for a ride
func (rc *RideContract) GetRideFeedback(ctx contractapi.TransactionContextInterface, rideID string) ([]*Feedback, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, fmt.Errorf("failed to get state by range: %v", err)
	}
	defer resultsIterator.Close()

	var feedbacks []*Feedback
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		if len(queryResponse.Key) > 9 && queryResponse.Key[:9] == "FEEDBACK_" {
			var fb Feedback
			if err := json.Unmarshal(queryResponse.Value, &fb); err != nil {
				continue
			}
			if fb.RideID == rideID {
				feedbacks = append(feedbacks, &fb)
			}
		}
	}
	return feedbacks, nil
}

// GetAllTransactions returns all payment transactions
func (rc *RideContract) GetAllTransactions(ctx contractapi.TransactionContextInterface) ([]*Transaction, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, fmt.Errorf("failed to get state by range: %v", err)
	}
	defer resultsIterator.Close()

	transactions := []*Transaction{}
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		if len(queryResponse.Key) > 4 && queryResponse.Key[:4] == "TXN_" {
			var txn Transaction
			if err := json.Unmarshal(queryResponse.Value, &txn); err != nil {
				continue
			}
			transactions = append(transactions, &txn)
		}
	}
	return transactions, nil
}

// GetAllFeedback returns all feedback records
func (rc *RideContract) GetAllFeedback(ctx contractapi.TransactionContextInterface) ([]*Feedback, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, fmt.Errorf("failed to get state by range: %v", err)
	}
	defer resultsIterator.Close()

	feedbacks := []*Feedback{}
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}
		if len(queryResponse.Key) > 9 && queryResponse.Key[:9] == "FEEDBACK_" {
			var fb Feedback
			if err := json.Unmarshal(queryResponse.Value, &fb); err != nil {
				continue
			}
			feedbacks = append(feedbacks, &fb)
		}
	}
	return feedbacks, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&RideContract{})
	if err != nil {
		fmt.Printf("Error creating ride chaincode: %v", err)
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting ride chaincode: %v", err)
	}
}
