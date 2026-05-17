import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  Globe,
  Heart,
  Star,
  Utensils,
  Pencil,
  Check,
  X,
  Trash2,
} from "lucide-react";
import {
  getPlace,
  getComments,
  getReviews,
  addComment,
  addReview,
  updateReview,
  deleteReview,
  toggleFavorite,
  isFavorite,
  deleteCustomPlace,
  updateCustomPlace,
} from "@/lib/places";
import { getCurrentUser } from "@/lib/api";
import { DiscoverPlace, PlaceComment, PlaceReview, PlaceTag } from "@/lib/types";
import { PLACE_CATEGORY_CONFIG } from "@/components/DiscoverMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ALL_TAGS: { value: PlaceTag; label: string }[] = [
  { value: "good_for_groups", label: "Good for groups" },
  { value: "quiet_after_6pm", label: "Quiet after 6pm" },
  { value: "cheap_drinks", label: "Cheap drinks" },
  { value: "good_study_spot", label: "Good study spot" },
  { value: "student_friendly", label: "Student-friendly" },
  { value: "outdoor_seating", label: "Outdoor seating" },
  { value: "open_late", label: "Open late" },
  { value: "great_views", label: "Great views" },
  { value: "laptop_friendly", label: "Laptop-friendly" },
  { value: "good_wifi", label: "Good wifi" },
];

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}>
          <Star
            className="h-6 w-6 transition-colors"
            fill={n <= value ? "#f59e0b" : "none"}
            stroke={n <= value ? "#f59e0b" : "#d1d5db"}
          />
        </button>
      ))}
    </div>
  );
}

function avgRating(reviews: PlaceReview[]): string {
  if (!reviews.length) return "—";
  return (
    reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
  ).toFixed(1);
}

export default function PlaceDetail() {
  const { placeId } = useParams<{ placeId: string }>();
  const navigate = useNavigate();

  const [place, setPlace] = useState<DiscoverPlace | null>(null);
  const [comments, setComments] = useState<PlaceComment[]>([]);
  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [meId, setMeId] = useState("");
  const [favorited, setFavorited] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<PlaceTag[]>([]);
  const [reviewBody, setReviewBody] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editReviewBody, setEditReviewBody] = useState("");

  const [commentBody, setCommentBody] = useState("");

  const refresh = async () => {
    if (!placeId) return;

    const [nextPlace, me] = await Promise.all([
      getPlace(placeId),
      getCurrentUser(),
    ]);

    if (!nextPlace) {
      navigate(-1);
      return;
    }

    setPlace(nextPlace);
    setMeId(me?.id ?? "");
    setComments(getComments(placeId));
    setReviews(getReviews(placeId));
    setFavorited(isFavorite(me?.id ?? "", placeId));
  };

  useEffect(() => {
    refresh();
  }, [placeId]);

  const handleFavorite = () => {
    if (!placeId) return;

    const added = toggleFavorite(meId, placeId);

    setFavorited(added);
    toast(added ? "❤️ Saved to favourites" : "Removed from favourites");
  };

  const startEdit = () => {
    if (!place) return;

    setEditName(place.name);
    setEditDesc(place.description ?? "");
    setEditAddress(place.address ?? "");
    setEditMode(true);
  };

  const handleSaveEdit = () => {
    if (!placeId || !editName.trim()) return;

    updateCustomPlace(placeId, {
      name: editName.trim(),
      description: editDesc.trim() || undefined,
      address: editAddress.trim() || undefined,
    });

    toast.success("Place updated");
    setEditMode(false);
    refresh();
  };

  const handleDelete = () => {
    if (!placeId) return;

    deleteCustomPlace(placeId);
    toast("Place deleted");
    navigate(-1);
  };

  const handleAddReview = () => {
    if (!placeId) return;

    if (!rating) {
      toast.error("Pick a star rating");
      return;
    }

    addReview(
      placeId,
      meId,
      rating as PlaceReview["rating"],
      selectedTags,
      reviewBody || undefined,
    );

    toast.success("Review added!");
    setRating(0);
    setSelectedTags([]);
    setReviewBody("");
    setShowReviewForm(false);
    refresh();
  };

  const handleAddComment = () => {
    if (!placeId || !commentBody.trim()) return;

    addComment(placeId, meId, commentBody.trim());
    setCommentBody("");
    refresh();
  };

  const toggleTag = (tag: PlaceTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
  };

  const tagCounts = reviews
    .flatMap((review) => review.tags)
    .reduce<Record<string, number>>((acc, tag) => {
      acc[tag] = (acc[tag] ?? 0) + 1;
      return acc;
    }, {});

  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

  if (!place) return null;

  const cfg = PLACE_CATEGORY_CONFIG[place.category];
  const isOwn = place.source === "manual";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-muted/20">
      <header className="safe-top shrink-0 border-b border-border bg-background/90 px-5 py-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <h1 className="flex-1 truncate text-lg font-bold">
            {editMode ? "Edit place" : place.name}
          </h1>

          {!editMode && (
            <div className="flex shrink-0 items-center gap-3">
              {isOwn && (
                <>
                  <button
                    type="button"
                    onClick={startEdit}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Edit place"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Delete place"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleFavorite}
                className={
                  favorited
                    ? "text-red-500"
                    : "text-muted-foreground transition-colors hover:text-red-400"
                }
                aria-label="Toggle favourite"
              >
                <Heart
                  className="h-5 w-5"
                  fill={favorited ? "currentColor" : "none"}
                />
              </button>
            </div>
          )}

          {editMode && (
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setEditMode(false)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Cancel edit"
              >
                <X className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleSaveEdit}
                className="text-primary"
                aria-label="Save edit"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto overflow-x-hidden p-4 pb-28">
        {editMode ? (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Name *
              </label>

              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Place name"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Description
              </label>

              <Input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="What's it like?"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Address
              </label>

              <Input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Street address"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSaveEdit}
              disabled={!editName.trim()}
            >
              Save changes
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: cfg.color + "22", color: cfg.color }}
              >
                {cfg.emoji} {cfg.label}
              </span>

              {isOwn && (
                <span className="text-xs font-medium text-blue-600">
                  📌 Your place
                </span>
              )}

              {place.area && (
                <span className="text-xs text-muted-foreground">
                  📍 {place.area}
                </span>
              )}

              {reviews.length > 0 && (
                <span className="ml-auto flex items-center gap-1 text-xs font-medium text-amber-600">
                  <Star className="h-3.5 w-3.5" fill="currentColor" />
                  {avgRating(reviews)} ({reviews.length})
                </span>
              )}
            </div>

            {place.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {place.description}
              </p>
            )}

            {(place.address ||
              place.openingHours ||
              place.cuisine ||
              place.website) && (
              <div className="divide-y divide-border rounded-2xl border border-border bg-card">
                {place.address && (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <span className="mt-0.5 text-base">📍</span>
                    <p className="text-sm text-foreground">{place.address}</p>
                  </div>
                )}

                {place.openingHours && (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="text-sm text-foreground">
                      {place.openingHours}
                    </p>
                  </div>
                )}

                {place.cuisine && (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <Utensils className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="text-sm capitalize text-foreground">
                      {place.cuisine}
                    </p>
                  </div>
                )}

                {place.website && (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <Globe className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <a
                      href={place.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm text-primary underline"
                    >
                      {place.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
              </div>
            )}

            {sortedTags.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Community says
                </p>

                <div className="flex flex-wrap gap-2">
                  {sortedTags.map(([tag, count]) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {ALL_TAGS.find((item) => item.value === tag)?.label ??
                        tag}
                      <span className="ml-1 text-muted-foreground">
                        · {count}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Reviews ({reviews.length})
                </p>

                <button
                  type="button"
                  onClick={() => setShowReviewForm((value) => !value)}
                  className="text-xs font-medium text-primary"
                >
                  {showReviewForm ? "Cancel" : "+ Add review"}
                </button>
              </div>

              {showReviewForm && (
                <div className="mb-3 space-y-3 rounded-2xl border border-border bg-card p-4">
                  <StarRating value={rating} onChange={setRating} />

                  <div className="flex flex-wrap gap-1.5">
                    {ALL_TAGS.map((tag) => (
                      <button
                        key={tag.value}
                        type="button"
                        onClick={() => toggleTag(tag.value)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                          selectedTags.includes(tag.value)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground"
                        }`}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>

                  <Input
                    placeholder="Add a note (optional)"
                    value={reviewBody}
                    onChange={(e) => setReviewBody(e.target.value)}
                  />

                  <Button
                    className="w-full"
                    size="sm"
                    onClick={handleAddReview}
                  >
                    Submit review
                  </Button>
                </div>
              )}

              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No reviews yet — be the first!
                </p>
              ) : (
                <div className="space-y-2">
                  {reviews.map((review) => {
                    const ownReview = review.authorId === meId;
                    const isEditing = editingReviewId === review.id;

                    return (
                      <div
                        key={review.id}
                        className="space-y-1 rounded-xl border border-border bg-background p-3"
                      >
                        {isEditing ? (
                          <div className="space-y-2">
                            <StarRating
                              value={editRating}
                              onChange={setEditRating}
                            />

                            <Input
                              value={editReviewBody}
                              onChange={(e) =>
                                setEditReviewBody(e.target.value)
                              }
                              placeholder="Update your review…"
                            />

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  updateReview(review.id, meId, {
                                    rating:
                                      editRating as PlaceReview["rating"],
                                    body: editReviewBody || undefined,
                                  });
                                  setEditingReviewId(null);
                                  refresh();
                                }}
                              >
                                Save
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingReviewId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <StarRating
                                value={review.rating}
                                onChange={() => {}}
                              />

                              {ownReview && (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      setEditingReviewId(review.id);
                                      setEditRating(review.rating);
                                      setEditReviewBody(review.body ?? "");
                                    }}
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    className="text-xs text-destructive hover:opacity-80"
                                    onClick={() => {
                                      deleteReview(review.id, meId);
                                      refresh();
                                    }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>

                            {review.body && (
                              <p className="text-sm text-muted-foreground">
                                {review.body}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Comments ({comments.length})
              </p>

              <div className="mb-3 flex gap-2">
                <Input
                  placeholder="ETH students love this spot…"
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddComment();
                  }}
                />

                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!commentBody.trim()}
                >
                  Post
                </Button>
              </div>

              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No comments yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-xl border border-border bg-card px-3 py-2.5"
                    >
                      <p className="text-sm">{comment.body}</p>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}