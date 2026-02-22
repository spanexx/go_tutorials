package main

import (
	"context"
	"fmt"
	"os"

	"github.com/socialhub/auth-service/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://spanexx:spanexx@localhost:5432/socialhub_test?sslmode=disable"
	}

	repo, err := repository.NewRepository(dbURL)
	if err != nil {
		fmt.Println("Failed to connect:", err)
		return
	}
	defer repo.Close()

	user, err := repo.GetUserByEmail(context.Background(), "test@example.com")
	if err != nil {
		fmt.Println("User not found:", err)
		return
	}

	fmt.Println("User found, testing password...")
	password := "password123"
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password))
	if err != nil {
		fmt.Println("Password does NOT match:", err)
		fmt.Println("Hash from DB:", user.PasswordHash)
	} else {
		fmt.Println("Password MATCHES! Login should work.")
	}
}
