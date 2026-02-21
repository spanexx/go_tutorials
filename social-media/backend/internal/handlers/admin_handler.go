package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/socialhub/auth-service/internal/email"
)

// AdminHandler handles admin/debug endpoints
type AdminHandler struct {
	emailService *email.EmailService
}

// NewAdminHandler creates a new admin handler
func NewAdminHandler(emailService *email.EmailService) *AdminHandler {
	return &AdminHandler{
		emailService: emailService,
	}
}

// TestEmailRequest represents test email request
type TestEmailRequest struct {
	To string `json:"to" binding:"required,email"`
}

// SendTestEmail sends a test email
// @Summary Send test email
// @Description Send a test email (development only)
// @Tags admin
// @Accept json
// @Produce json
// @Param request body TestEmailRequest true "Recipient email"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Router /api/v1/admin/test-email [post]
func (h *AdminHandler) SendTestEmail(c *gin.Context) {
	var req TestEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if h.emailService == nil || !h.emailService.IsEnabled() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Email service is disabled"})
		return
	}

	// Create test email content
	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head><title>Test Email</title></head>
<body style="font-family: sans-serif; padding: 20px;">
	<h1 style="color: #667eea;">Test Email from SocialHub</h1>
	<p>This is a test email sent from the SocialHub auth service.</p>
	<p><strong>Timestamp:</strong> %s</p>
	<p><strong>Recipient:</strong> %s</p>
	<p style="color: #10b981; margin-top: 30px;">✅ If you received this, email sending is working correctly!</p>
</body>
</html>`, time.Now().Format("2006-01-02 15:04:05"), req.To)

	textBody := fmt.Sprintf(`Test Email from SocialHub

This is a test email sent from the SocialHub auth service.

Timestamp: %s
Recipient: %s

✅ If you received this, email sending is working correctly!`,
		time.Now().Format("2006-01-02 15:04:05"), req.To)

	msg := &email.EmailMessage{
		To:       []string{req.To},
		Subject:  "Test Email from SocialHub",
		HTMLBody: htmlBody,
		TextBody: textBody,
	}

	ctx := c.Request.Context()
	if err := h.emailService.SendEmail(ctx, msg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to send email: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Test email sent successfully",
		"to":      req.To,
	})
}

// PreviewEmailRequest represents email preview request
type PreviewEmailRequest struct {
	Template string `json:"template" binding:"required"`
	Name     string `json:"name"`
	Token    string `json:"token"`
}

// PreviewEmail renders and returns email template preview
// @Summary Preview email template
// @Description Preview email template with sample data
// @Tags admin
// @Accept json
// @Produce html
// @Param request body PreviewEmailRequest true "Template name and variables"
// @Success 200 {string} html "HTML email preview"
// @Failure 400 {object} map[string]string
// @Router /api/v1/admin/preview-email [post]
func (h *AdminHandler) PreviewEmail(c *gin.Context) {
	var req PreviewEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.Template == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Template name is required"})
		return
	}

	if h.emailService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Email service not available"})
		return
	}

	// Set default values for preview
	if req.Name == "" {
		req.Name = "John Doe"
	}
	if req.Token == "" {
		req.Token = "sample-verification-token-12345"
	}

	var htmlBody string

	switch req.Template {
	case "welcome":
		htmlBody = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head><title>Welcome to SocialHub!</title></head>
<body style="font-family: sans-serif; padding: 20px; background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);">
	<div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px;">
		<h1 style="color: #667eea;">Welcome to SocialHub!</h1>
		<p>Hi %s,</p>
		<p>Welcome to SocialHub! We're excited to have you on board.</p>
		<p>Get started by exploring your feed and connecting with friends!</p>
		<a href="https://socialhub.example.com/feed" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; text-decoration: none; border-radius: 6px; margin-top: 20px;">Go to Your Feed</a>
	</div>
</body>
</html>`, req.Name)

	case "verification":
		verifyLink := fmt.Sprintf("https://socialhub.example.com/verify-email?token=%s", req.Token)
		htmlBody = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head><title>Verify Your Email</title></head>
<body style="font-family: sans-serif; padding: 20px; background: linear-gradient(135deg, #10b981 0%%, #059669 100%%);">
	<div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px;">
		<h1 style="color: #10b981;">Verify Your Email</h1>
		<p>Hi %s,</p>
		<p>Thanks for joining SocialHub! Please verify your email by clicking the button below.</p>
		<a href="%s" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981 0%%, #059669 100%%); color: white; text-decoration: none; border-radius: 6px; margin-top: 20px;">Verify Email Address</a>
		<p style="margin-top: 20px; color: #6b7280; font-size: 14px;">Or copy this link: %s</p>
		<p style="color: #f59e0b; margin-top: 20px;">⏰ This link expires in 24 hours</p>
	</div>
</body>
</html>`, req.Name, verifyLink, verifyLink)

	case "password-reset":
		resetLink := fmt.Sprintf("https://socialhub.example.com/reset-password?token=%s", req.Token)
		htmlBody = fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head><title>Password Reset Request</title></head>
<body style="font-family: sans-serif; padding: 20px; background: linear-gradient(135deg, #f59e0b 0%%, #d97706 100%%);">
	<div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px;">
		<h1 style="color: #f59e0b;">Password Reset Request</h1>
		<p>Hi %s,</p>
		<p>We received a request to reset your password. Click the button below to create a new password.</p>
		<a href="%s" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #f59e0b 0%%, #d97706 100%%); color: white; text-decoration: none; border-radius: 6px; margin-top: 20px;">Reset Password</a>
		<p style="margin-top: 20px; color: #6b7280; font-size: 14px;">Or copy this link: %s</p>
		<p style="color: #ef4444; margin-top: 20px;">⏰ This link expires in 1 hour</p>
		<p style="color: #ef4444; margin-top: 20px; font-size: 14px;">🔒 If you didn't request this, please contact support immediately.</p>
	</div>
</body>
</html>`, req.Name, resetLink, resetLink)

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Unknown template: %s. Available: welcome, verification, password-reset", req.Template)})
		return
	}

	c.Header("Content-Type", "text/html")
	c.Data(http.StatusOK, "text/html; charset=utf-8", []byte(htmlBody))
}

// GetEmailConfig returns current email configuration (sanitized)
// @Summary Get email configuration
// @Description Get current email configuration (development only)
// @Tags admin
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/admin/email-config [get]
func (h *AdminHandler) GetEmailConfig(c *gin.Context) {
	if h.emailService == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Email service not available"})
		return
	}

	config := h.emailService.GetSMTPConfig()
	enabled := h.emailService.IsEnabled()

	// Return sanitized config (hide password)
	c.JSON(http.StatusOK, gin.H{
		"enabled":      enabled,
		"host":         config.Host,
		"port":         config.Port,
		"username":     config.Username,
		"from_name":    config.FromName,
		"from_address": config.FromEmail,
	})
}
