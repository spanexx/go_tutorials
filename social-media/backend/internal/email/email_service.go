// Package email provides email sending functionality using SMTP.
// Code Map: email_service.go
// - EmailService interface: Email sending abstraction
// - SMTPConfig: SMTP configuration struct
// - EmailMessage: Email message struct
// - EmailService struct: SMTP-based email service implementation
// - NewEmailService: Constructor
// - SendEmail: Send email with HTML and plain text fallback
// - SendWelcomeEmail: Send welcome email to new users
// - SendVerificationEmail: Send email verification token
// - SendPasswordResetEmail: Send password reset token
// CID: [1/6] Email Service Infrastructure - 1.6.1
package email

import (
	"bytes"
	"context"
	"fmt"
	"html/template"
	"net/smtp"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

// EmailMessage represents an email message
type EmailMessage struct {
	To          []string
	From        string
	Subject     string
	HTMLBody    string
	TextBody    string
	Attachments []string
}

// SMTPConfig holds SMTP configuration
type SMTPConfig struct {
	Host     string
	Port     int
	Username string
	Password string
	FromName string
	FromEmail string
}

// EmailService handles email sending via SMTP
type EmailService struct {
	config      *SMTPConfig
	templateDir string
	enabled     bool
	queue       *EmailQueue
	frontendURL string
}

// SetQueue sets the email queue for async sending
func (s *EmailService) SetQueue(queue *EmailQueue) {
	s.queue = queue
}

// SetFrontendURL sets the frontend URL for generating links
func (s *EmailService) SetFrontendURL(url string) {
	s.frontendURL = url
}

// getFrontendURL returns the frontend URL or default
func (s *EmailService) getFrontendURL() string {
	if s.frontendURL != "" {
		return s.frontendURL
	}
	return "http://localhost:4200"
}

// EmailServiceInterface defines the interface for email operations
type EmailServiceInterface interface {
	// SendEmail sends a generic email message
	SendEmail(ctx context.Context, msg *EmailMessage) error
	
	// SendWelcomeEmail sends a welcome email to a new user
	SendWelcomeEmail(ctx context.Context, toEmail, name string) error
	
	// SendVerificationEmail sends an email verification token
	SendVerificationEmail(ctx context.Context, toEmail, name, token string) error
	
	// SendPasswordResetEmail sends a password reset token
	SendPasswordResetEmail(ctx context.Context, toEmail, name, token string) error
	
	// IsEnabled returns whether email service is enabled
	IsEnabled() bool
	
	// GetSMTPConfig returns the SMTP configuration
	GetSMTPConfig() *SMTPConfig
}

// Ensure EmailService implements EmailServiceInterface
var _ EmailServiceInterface = (*EmailService)(nil)

// NewEmailService creates a new email service
func NewEmailService(config *SMTPConfig, templateDir string, enabled bool) *EmailService {
	return &EmailService{
		config:     config,
		templateDir: templateDir,
		enabled:    enabled,
	}
}

// IsEnabled returns whether email service is enabled
func (s *EmailService) IsEnabled() bool {
	return s.enabled
}

// GetSMTPConfig returns the SMTP configuration
func (s *EmailService) GetSMTPConfig() *SMTPConfig {
	return s.config
}

// SendEmail sends an email message via SMTP
func (s *EmailService) SendEmail(ctx context.Context, msg *EmailMessage) error {
	if !s.enabled {
		return nil // Skip sending if disabled
	}

	if len(msg.To) == 0 {
		return fmt.Errorf("no recipients specified")
	}

	// Create email buffer
	var buf bytes.Buffer

	// Write headers
	from := fmt.Sprintf("%s <%s>", s.config.FromName, s.config.FromEmail)
	buf.WriteString(fmt.Sprintf("From: %s\r\n", from))
	buf.WriteString(fmt.Sprintf("To: %s\r\n", strings.Join(msg.To, ", ")))
	buf.WriteString(fmt.Sprintf("Subject: %s\r\n", msg.Subject))
	buf.WriteString("MIME-Version: 1.0\r\n")

	// Multipart alternative for HTML and plain text
	boundary := uuid.New().String()
	buf.WriteString(fmt.Sprintf("Content-Type: multipart/alternative; boundary=%s\r\n", boundary))
	buf.WriteString("\r\n")

	// Plain text part
	if msg.TextBody != "" {
		buf.WriteString(fmt.Sprintf("--%s\r\n", boundary))
		buf.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
		buf.WriteString("Content-Transfer-Encoding: quoted-printable\r\n")
		buf.WriteString("\r\n")
		buf.WriteString(msg.TextBody)
		buf.WriteString("\r\n\r\n")
	}

	// HTML part
	if msg.HTMLBody != "" {
		buf.WriteString(fmt.Sprintf("--%s\r\n", boundary))
		buf.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
		buf.WriteString("Content-Transfer-Encoding: quoted-printable\r\n")
		buf.WriteString("\r\n")
		buf.WriteString(msg.HTMLBody)
		buf.WriteString("\r\n\r\n")
	}

	// End boundary
	buf.WriteString(fmt.Sprintf("--%s--\r\n", boundary))

	// Send email via SMTP
	addr := fmt.Sprintf("%s:%d", s.config.Host, s.config.Port)
	auth := smtp.PlainAuth("", s.config.Username, s.config.Password, s.config.Host)

	err := smtp.SendMail(addr, auth, s.config.FromEmail, msg.To, buf.Bytes())
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	return nil
}

// renderTemplate renders an email template with the given data
func (s *EmailService) renderTemplate(templateName string, data interface{}) (string, error) {
	templatePath := filepath.Join(s.templateDir, templateName)
	tmpl, err := template.ParseFiles(templatePath)
	if err != nil {
		return "", fmt.Errorf("failed to parse template %s: %w", templateName, err)
	}

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", fmt.Errorf("failed to execute template %s: %w", templateName, err)
	}

	return buf.String(), nil
}

// SendWelcomeEmail sends a welcome email to a new user
func (s *EmailService) SendWelcomeEmail(ctx context.Context, toEmail, name string) error {
	if !s.enabled {
		return nil
	}

	data := map[string]interface{}{
		"Name":      name,
		"Year":      time.Now().Year(),
		"SupportEmail": "support@socialhub.example.com",
	}

	htmlBody, err := s.renderTemplate("welcome.html", data)
	if err != nil {
		return fmt.Errorf("failed to render welcome template: %w", err)
	}

	textBody, err := s.renderTemplate("welcome.txt", data)
	if err != nil {
		return fmt.Errorf("failed to render welcome text template: %w", err)
	}

	msg := &EmailMessage{
		To:       []string{toEmail},
		Subject:  "Welcome to SocialHub!",
		HTMLBody: htmlBody,
		TextBody: textBody,
	}

	return s.SendEmail(ctx, msg)
}

// SendVerificationEmail sends an email verification token
func (s *EmailService) SendVerificationEmail(ctx context.Context, toEmail, name, token string) error {
	if !s.enabled {
		return nil
	}

	// Generate verification link using configured frontend URL
	frontendURL := s.getFrontendURL()
	verifyLink := fmt.Sprintf("%s/verify-email?token=%s", frontendURL, token)

	data := map[string]interface{}{
		"Name":         name,
		"VerifyLink":   verifyLink,
		"Token":        token,
		"ExpiryHours":  24,
		"Year":         time.Now().Year(),
		"SupportEmail": "support@socialhub.example.com",
	}

	htmlBody, err := s.renderTemplate("verification.html", data)
	if err != nil {
		return fmt.Errorf("failed to render verification template: %w", err)
	}

	textBody, err := s.renderTemplate("verification.txt", data)
	if err != nil {
		return fmt.Errorf("failed to render verification text template: %w", err)
	}

	msg := &EmailMessage{
		To:       []string{toEmail},
		Subject:  "Verify Your Email - SocialHub",
		HTMLBody: htmlBody,
		TextBody: textBody,
	}

	return s.SendEmail(ctx, msg)
}

// SendPasswordResetEmail sends a password reset token
func (s *EmailService) SendPasswordResetEmail(ctx context.Context, toEmail, name, token string) error {
	if !s.enabled {
		return nil
	}

	// Generate reset link using configured frontend URL
	frontendURL := s.getFrontendURL()
	resetLink := fmt.Sprintf("%s/reset-password?token=%s", frontendURL, token)

	data := map[string]interface{}{
		"Name":         name,
		"ResetLink":    resetLink,
		"Token":        token,
		"ExpiryHours":  1,
		"Year":         time.Now().Year(),
		"SupportEmail": "support@socialhub.example.com",
	}

	htmlBody, err := s.renderTemplate("password-reset.html", data)
	if err != nil {
		return fmt.Errorf("failed to render password reset template: %w", err)
	}

	textBody, err := s.renderTemplate("password-reset.txt", data)
	if err != nil {
		return fmt.Errorf("failed to render password reset text template: %w", err)
	}

	msg := &EmailMessage{
		To:       []string{toEmail},
		Subject:  "Password Reset Request - SocialHub",
		HTMLBody: htmlBody,
		TextBody: textBody,
	}

	return s.SendEmail(ctx, msg)
}
