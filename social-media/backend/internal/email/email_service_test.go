// Code Map: email_service_test.go
// - TestEmailService: Email service tests
// - TestSendEmail: Send email tests
// - TestTemplateRendering: Template rendering tests
// - TestTokenGeneration: Token generation tests
// CID: Email Integration Tests - 1.6.10
package email

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"os"
	"strings"
	"testing"
	"time"
)

// TestEmailService tests the email service initialization
func TestEmailService(t *testing.T) {
	t.Run("NewEmailService", func(t *testing.T) {
		config := &SMTPConfig{
			Host:        "smtp.example.com",
			Port:        587,
			Username:    "user",
			Password:    "pass",
			FromName:    "Test",
			FromEmail:   "test@example.com",
		}
		
		service := NewEmailService(config, "/templates", true)
		
		if service == nil {
			t.Fatal("Expected email service to be created")
		}
		
		if !service.IsEnabled() {
			t.Error("Expected email service to be enabled")
		}
		
		if service.GetSMTPConfig().Host != "smtp.example.com" {
			t.Error("Expected SMTP config to be set")
		}
	})

	t.Run("DisabledEmailService", func(t *testing.T) {
		service := NewEmailService(nil, "", false)
		
		if service.IsEnabled() {
			t.Error("Expected email service to be disabled")
		}
	})
}

// TestSendEmail tests email sending functionality
func TestSendEmail(t *testing.T) {
	t.Run("SendEmailWithDisabledService", func(t *testing.T) {
		service := NewEmailService(nil, "", false)
		
		msg := &EmailMessage{
			To:       []string{"test@example.com"},
			Subject:  "Test",
			HTMLBody: "<p>Test</p>",
			TextBody: "Test",
		}
		
		// Should not error when disabled
		err := service.SendEmail(context.Background(), msg)
		if err != nil {
			t.Errorf("Expected no error when disabled, got: %v", err)
		}
	})

	t.Run("SendEmailWithNoRecipients", func(t *testing.T) {
		config := &SMTPConfig{
			Host:        "smtp.example.com",
			Port:        587,
			Username:    "user",
			Password:    "pass",
			FromName:    "Test",
			FromEmail:   "test@example.com",
		}
		service := NewEmailService(config, "", true)
		
		msg := &EmailMessage{
			To:       []string{},
			Subject:  "Test",
			HTMLBody: "<p>Test</p>",
			TextBody: "Test",
		}
		
		err := service.SendEmail(context.Background(), msg)
		if err == nil {
			t.Error("Expected error for no recipients")
		}
		
		if !strings.Contains(err.Error(), "no recipients") {
			t.Errorf("Expected 'no recipients' error, got: %v", err)
		}
	})
}

// TestTemplateRendering tests email template rendering
func TestTemplateRendering(t *testing.T) {
	// Create temporary template files for testing
	tmpDir := t.TempDir()
	
	// Create welcome template
	welcomeHTML := `<!DOCTYPE html><html><body><h1>Welcome {{.Name}}!</h1></body></html>`
	welcomeTXT := `Welcome {{.Name}}!`
	
	if err := os.WriteFile(tmpDir+"/welcome.html", []byte(welcomeHTML), 0644); err != nil {
		t.Fatalf("Failed to create welcome.html: %v", err)
	}
	if err := os.WriteFile(tmpDir+"/welcome.txt", []byte(welcomeTXT), 0644); err != nil {
		t.Fatalf("Failed to create welcome.txt: %v", err)
	}
	
	config := &SMTPConfig{
		Host:        "smtp.example.com",
		Port:        587,
		Username:    "user",
		Password:    "pass",
		FromName:    "Test",
		FromEmail:   "test@example.com",
	}
	service := NewEmailService(config, tmpDir, true)
	
	t.Run("RenderWelcomeTemplate", func(t *testing.T) {
		data := map[string]interface{}{
			"Name":      "John Doe",
			"Year":      2026,
			"SupportEmail": "support@example.com",
		}
		
		htmlBody, err := service.renderTemplate("welcome.html", data)
		if err != nil {
			t.Fatalf("Failed to render welcome.html: %v", err)
		}
		
		if !strings.Contains(htmlBody, "Welcome John Doe!") {
			t.Error("Expected rendered template to contain user name")
		}
		
		textBody, err := service.renderTemplate("welcome.txt", data)
		if err != nil {
			t.Fatalf("Failed to render welcome.txt: %v", err)
		}
		
		if !strings.Contains(textBody, "Welcome John Doe!") {
			t.Error("Expected rendered text template to contain user name")
		}
	})

	t.Run("RenderNonExistentTemplate", func(t *testing.T) {
		_, err := service.renderTemplate("nonexistent.html", nil)
		if err == nil {
			t.Error("Expected error for non-existent template")
		}
	})
}

// TestTokenGeneration tests verification token generation
func TestTokenGeneration(t *testing.T) {
	t.Run("GenerateVerificationToken", func(t *testing.T) {
		// Test that tokens can be generated (crypto/rand)
		token := generateTestToken()
		
		// Tokens should be 64 characters (32 bytes hex encoded)
		if len(token) != 64 {
			t.Errorf("Expected token length 64, got %d", len(token))
		}
	})

	t.Run("TokenEntropy", func(t *testing.T) {
		// Generate multiple tokens and check entropy
		tokens := make(map[string]bool)
		for i := 0; i < 100; i++ {
			token := generateTestToken()
			tokens[token] = true
		}
		
		// All tokens should be unique
		if len(tokens) != 100 {
			t.Errorf("Expected 100 unique tokens, got %d", len(tokens))
		}
	})
}

// generateTestToken generates a test token using crypto/rand
func generateTestToken() string {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return ""
	}
	return hex.EncodeToString(bytes)
}

// TestEmailMessage tests email message structure
func TestEmailMessage(t *testing.T) {
	t.Run("EmailMessageStructure", func(t *testing.T) {
		msg := &EmailMessage{
			To:          []string{"user@example.com"},
			From:        "sender@example.com",
			Subject:     "Test Subject",
			HTMLBody:    "<html><body>Test</body></html>",
			TextBody:    "Test",
			Attachments: []string{},
		}
		
		if len(msg.To) != 1 {
			t.Error("Expected 1 recipient")
		}
		
		if msg.Subject != "Test Subject" {
			t.Error("Expected subject to be set")
		}
		
		if msg.HTMLBody == "" {
			t.Error("Expected HTML body to be set")
		}
		
		if msg.TextBody == "" {
			t.Error("Expected text body to be set")
		}
	})
}

// TestSMTPConfig tests SMTP configuration
func TestSMTPConfig(t *testing.T) {
	t.Run("SMTPConfigStructure", func(t *testing.T) {
		config := &SMTPConfig{
			Host:        "smtp.example.com",
			Port:        587,
			Username:    "user@example.com",
			Password:    "password123",
			FromName:    "Test User",
			FromEmail:   "test@example.com",
		}
		
		if config.Host != "smtp.example.com" {
			t.Error("Expected host to be set")
		}
		
		if config.Port != 587 {
			t.Error("Expected port to be 587")
		}
		
		if config.Username == "" {
			t.Error("Expected username to be set")
		}
		
		if config.Password == "" {
			t.Error("Expected password to be set")
		}
	})
}

// TestEmailQueue tests email queue functionality
func TestEmailQueue(t *testing.T) {
	t.Run("EmailTaskStructure", func(t *testing.T) {
		task := &EmailTask{
			To:          []string{"user@example.com"},
			Subject:     "Test",
			HTMLBody:    "<p>Test</p>",
			TextBody:    "Test",
			RetryCount:  0,
			MaxRetries:  3,
			CreatedAt:   time.Now(),
		}
		
		if len(task.To) != 1 {
			t.Error("Expected 1 recipient")
		}
		
		if task.MaxRetries != 3 {
			t.Error("Expected max retries to be 3")
		}
		
		if task.CreatedAt.IsZero() {
			t.Error("Expected created at to be set")
		}
	})
}

// Benchmark tests for performance
func BenchmarkGenerateVerificationToken(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_ = generateTestToken()
	}
}

func BenchmarkEmailServiceCreation(b *testing.B) {
	config := &SMTPConfig{
		Host:        "smtp.example.com",
		Port:        587,
		Username:    "user",
		Password:    "pass",
		FromName:    "Test",
		FromEmail:   "test@example.com",
	}
	
	for i := 0; i < b.N; i++ {
		_ = NewEmailService(config, "", true)
	}
}
