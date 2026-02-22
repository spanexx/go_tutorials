package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/socialhub/auth-service/internal/service"
)

type BookmarkHandler struct {
	bookmarkService *service.BookmarkService
}

func NewBookmarkHandler(bookmarkService *service.BookmarkService) *BookmarkHandler {
	return &BookmarkHandler{bookmarkService: bookmarkService}
}

type createBookmarkRequest struct {
	PostID       string `json:"postId" binding:"required"`
	CollectionID string `json:"collectionId"`
}

type createCollectionRequest struct {
	Name        string  `json:"name" binding:"required"`
	Description *string `json:"description"`
	Color       *string `json:"color"`
	Icon        *string `json:"icon"`
}

type moveBookmarkRequest struct {
	PostID           string `json:"postId" binding:"required"`
	FromCollectionID string `json:"fromCollectionId"`
	ToCollectionID   string `json:"toCollectionId" binding:"required"`
}

type addToCollectionRequest struct {
	PostID       string `json:"postId" binding:"required"`
	CollectionID string `json:"collectionId" binding:"required"`
}

func (h *BookmarkHandler) ListBookmarks(c *gin.Context) {
	userID := c.GetString("user_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	res, err := h.bookmarkService.ListBookmarks(c.Request.Context(), service.ListBookmarksInput{
		UserID: userID,
		Page:   page,
		Limit:  limit,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "fetch_failed", Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, res)
}

func (h *BookmarkHandler) CreateBookmark(c *gin.Context) {
	userID := c.GetString("user_id")
	var req createBookmarkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid_body", Message: err.Error()})
		return
	}

	b, err := h.bookmarkService.CreateBookmark(c.Request.Context(), service.CreateBookmarkInput{
		UserID:       userID,
		PostID:       req.PostID,
		CollectionID: req.CollectionID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "create_failed", Message: err.Error()})
		return
	}
	c.JSON(http.StatusCreated, b)
}

func (h *BookmarkHandler) DeleteBookmark(c *gin.Context) {
	userID := c.GetString("user_id")
	postID := c.Param("postId")
	if postID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid_id", Message: "postId is required"})
		return
	}
	if err := h.bookmarkService.DeleteBookmark(c.Request.Context(), userID, postID); err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: "not_found", Message: "bookmark not found"})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *BookmarkHandler) ListCollections(c *gin.Context) {
	userID := c.GetString("user_id")
	cols, err := h.bookmarkService.ListCollections(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "fetch_failed", Message: err.Error()})
		return
	}
	c.JSON(http.StatusOK, cols)
}

func (h *BookmarkHandler) CreateCollection(c *gin.Context) {
	userID := c.GetString("user_id")
	var req createCollectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid_body", Message: err.Error()})
		return
	}
	col, err := h.bookmarkService.CreateCollection(c.Request.Context(), service.CreateCollectionInput{
		UserID:      userID,
		Name:        req.Name,
		Description: req.Description,
		Color:       req.Color,
		Icon:        req.Icon,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "create_failed", Message: err.Error()})
		return
	}
	c.JSON(http.StatusCreated, col)
}

func (h *BookmarkHandler) DeleteCollection(c *gin.Context) {
	userID := c.GetString("user_id")
	collectionID := c.Param("collectionId")
	if collectionID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid_id", Message: "collectionId is required"})
		return
	}
	if err := h.bookmarkService.DeleteCollection(c.Request.Context(), userID, collectionID); err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: "not_found", Message: "collection not found"})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *BookmarkHandler) MoveBookmark(c *gin.Context) {
	userID := c.GetString("user_id")
	var req moveBookmarkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid_body", Message: err.Error()})
		return
	}
	if err := h.bookmarkService.MoveBookmark(c.Request.Context(), service.MoveBookmarkInput{
		UserID:           userID,
		PostID:           req.PostID,
		FromCollectionID: req.FromCollectionID,
		ToCollectionID:   req.ToCollectionID,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "move_failed", Message: err.Error()})
		return
	}
	c.Status(http.StatusOK)
}

func (h *BookmarkHandler) AddToCollection(c *gin.Context) {
	userID := c.GetString("user_id")
	var req addToCollectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "invalid_body", Message: err.Error()})
		return
	}
	if err := h.bookmarkService.AddToCollection(c.Request.Context(), service.AddToCollectionInput{
		UserID:       userID,
		PostID:       req.PostID,
		CollectionID: req.CollectionID,
	}); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "add_failed", Message: err.Error()})
		return
	}
	c.Status(http.StatusOK)
}
