import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock, Globe, Heart, Star, Utensils, Pencil, Check, X, Trash2 } from "lucide-react";
import {
  getPlace, getComments, getReviews,
  addComment, addReview, updateReview, deleteReview,
  toggleFavorite, isFavorite,
  deleteCustomPlace, updateCustomPlace,
} from "@/lib/places";
import { getCurrentUser } from "@/lib/api";
import { DiscoverPlace, PlaceComment, PlaceReview, PlaceTag } from "@/lib/types";
import { PLACE_CATEGORY_CONFIG } from "@/components/DiscoverMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ALL_TAGS: { value: PlaceTag; label: string }[] = [
  { value: "good_for_groups",   label: "Good for groups" },
  { value: "quiet_after_6pm",   label: "Quiet after 6pm" },
  { value: "cheap_drinks",      label: "Cheap drinks" },
  { value: "good_study_spot",   label: "Good study spot" },
  { value: "student_friendly",  label: "Student-friendly" },
  { value: "outdoor_seating",   label: "Outdoor seating" },
  { value: "open_late",         label: "Open late" },
  { value: "great_views",       label: "Great views" },
  { value: "laptop_friendly",   label: "Laptop-friendly" },
  { value: "good_wifi",         label: "Good wifi" },
];

function StarRating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onChange(n)}>
          <Star className="h-6 w-6 transition-colors"
            fill={n <= value ? "#f59e0b" : "none"}
            stroke={n <= value ? "#f59e0b" : "#d1d5db"} />
        </button>
      ))}
    </div>
  );
}

function avgRating(reviews: PlaceReview[]): string {
  if (!reviews.length) return "—";
  return (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
}

export default function PlaceDetail() {
  const { placeId } = useParams<{ placeId: string }>();
  const navigate = useNavigate();

  const [place, setPlace] = useState<DiscoverPlace | null>(null);
  const [comments, setComments] = useState<PlaceComment[]>([]);
  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [meId, setMeId] = useState("");
  const [favorited, setFavorited] = useState(false);

  // Edit state (only for source === "manual")
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editAddress, setEditAddress] = useState("");

  // Review form
  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<PlaceTag[]>([]);
  const [reviewBody, setReviewBody] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editReviewBody, setEditReviewBody] = useState("");

  // Comment form
  const [commentBody, setCommentBody] = useState("");

  const refresh = async () => {
    if (!placeId) return;
    const [p, me] = await Promise.all([getPlace(placeId), getCurrentUser()]);
    if (!p) { navigate(-1); return; }
    setPlace(p);
    setMeId(me?.id ?? "");
    setComments(getComments(placeId));
    setReviews(getReviews(placeId));
    setFavorited(isFavorite(me?.id ?? "", placeId));
  };

  useEffect(() => { refresh(); }, [placeId]);

  const handleFavorite = () => {
    const added = toggleFavorite(meId, placeId!);
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
    if (!rating) { toast.error("Pick a star rating"); return; }
    addReview(placeId!, meId, rating as PlaceReview["rating"], selectedTags, reviewBody || undefined);
    toast.success("Review added!");
    setRating(0); setSelectedTags([]); setReviewBody(""); setShowReviewForm(false);
    refresh();
  };

  const handleAddComment = () => {
    if (!commentBody.trim()) return;
    addComment(placeId!, meId, commentBody.trim());
    setCommentBody("");
    refresh();
  };

  const toggleTag = (tag: PlaceTag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  // Compute community tags before return
  const tagCounts = reviews
    .flatMap((r) => r.tags)
    .reduce<Record<string, number>>((acc, t) => {
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {});
  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

  if (!place) return null;

  const cfg = PLACE_CATEGORY_CONFIG[place.category];
  const isOwn = place.source === "manual";

  return (
    <div>
      {/* Header */}
      <header className="safe-top sticky top-0 z-30 border-b border-border bg-background/90 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-lg font-bold truncate">{editMode ? "Edit place" : place.name}</h1>

          {/* Right side buttons — differ based on own vs external and edit mode */}
          {!editMode && (
            <div className="flex items-center gap-3">
              {isOwn && (
                <>
                  <button onClick={startEdit} className="text-muted-foreground hover:text-foreground">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={handleDelete} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
              <button
                onClick={handleFavorite}
                className={favorited ? "text-red-500" : "text-muted-foreground hover:text-red-400"}
              >
                <Heart className="h-5 w-5" fill={favorited ? "currentColor" : "none"} />
              </button>
            </div>
          )}
          {editMode && (
            <div className="flex items-center gap-3">
              <button onClick={() => setEditMode(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
              <button onClick={handleSaveEdit} className="text-primary">
                <Check className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="p-4 space-y-5">

        {/* Edit form — shown instead of normal content when editing */}
        {editMode ? (
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Place name" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Description</label>
              <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="What's it like?" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Address</label>
              <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} placeholder="Street address" />
            </div>
            <Button className="w-full" onClick={handleSaveEdit} disabled={!editName.trim()}>
              Save changes
            </Button>
          </div>
        ) : (
          <>
            {/* Category + area */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: cfg.color + "22", color: cfg.color }}
              >
                {cfg.emoji} {cfg.label}
              </span>
              {isOwn && (
                <span className="text-xs text-blue-600 font-medium">📌 Your place</span>
              )}
              {place.area && (
                <span className="text-xs text-muted-foreground">📍 {place.area}</span>
              )}
              {reviews.length > 0 && (
                <span className="flex items-center gap-1 text-xs text-amber-600 font-medium ml-auto">
                  <Star className="h-3.5 w-3.5" fill="currentColor" />
                  {avgRating(reviews)} ({reviews.length})
                </span>
              )}
            </div>

            {/* Description */}
            {place.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{place.description}</p>
            )}

            {/* Info card */}
            {(place.address || place.openingHours || place.cuisine || place.website) && (
              <div className="rounded-2xl border border-border bg-card divide-y divide-border">
                {place.address && (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <span className="text-base mt-0.5">📍</span>
                    <p className="text-sm text-foreground">{place.address}</p>
                  </div>
                )}
                {place.openingHours && (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground">{place.openingHours}</p>
                  </div>
                )}
                {place.cuisine && (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <Utensils className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground capitalize">{place.cuisine}</p>
                  </div>
                )}
                {place.website && (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <Globe className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <a href={place.website} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-primary underline truncate">
                      {place.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Community tags */}
            {sortedTags.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Community says</p>
                <div className="flex flex-wrap gap-2">
                  {sortedTags.map(([tag, count]) => (
                    <span key={tag} className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground">
                      {ALL_TAGS.find((t) => t.value === tag)?.label ?? tag}
                      <span className="ml-1 text-muted-foreground">· {count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Reviews ({reviews.length})
                </p>
                <button onClick={() => setShowReviewForm((v) => !v)} className="text-xs text-primary font-medium">
                  {showReviewForm ? "Cancel" : "+ Add review"}
                </button>
              </div>

              {showReviewForm && (
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3 mb-3">
                  <StarRating value={rating} onChange={setRating} />
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_TAGS.map((t) => (
                      <button key={t.value} onClick={() => toggleTag(t.value)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                          selectedTags.includes(t.value)
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground"
                        }`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <Input placeholder="Add a note (optional)" value={reviewBody}
                    onChange={(e) => setReviewBody(e.target.value)} />
                  <Button className="w-full" size="sm" onClick={handleAddReview}>Submit review</Button>
                </div>
              )}

              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No reviews yet — be the first!</p>
              ) : (
                <div className="space-y-2">
                  {reviews.map((r) => {
                    const isOwn = r.authorId === meId;
                    const isEditing = editingReviewId === r.id;
                    return (
                      <div key={r.id} className="rounded-xl border border-border bg-background p-3 space-y-1">
                        {isEditing ? (
                          <div className="space-y-2">
                            <StarRating value={editRating} onChange={setEditRating} />
                            <Input
                              value={editReviewBody}
                              onChange={(e) => setEditReviewBody(e.target.value)}
                              placeholder="Update your review…"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => {
                                updateReview(r.id, meId, { rating: editRating as PlaceReview["rating"], body: editReviewBody || undefined });
                                setEditingReviewId(null);
                                refresh();
                              }}>Save</Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingReviewId(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <StarRating value={r.rating} onChange={() => {}} />
                              {isOwn && (
                                <div className="flex gap-2">
                                  <button
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => { setEditingReviewId(r.id); setEditRating(r.rating); setEditReviewBody(r.body ?? ""); }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="text-xs text-destructive hover:opacity-80"
                                    onClick={() => { deleteReview(r.id, meId); refresh(); }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </div>
                            {r.body && <p className="text-sm text-muted-foreground">{r.body}</p>}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Comments */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Comments ({comments.length})
              </p>
              <div className="flex gap-2 mb-3">
                <Input placeholder="ETH students love this spot…" value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(); }} />
                <Button size="sm" onClick={handleAddComment} disabled={!commentBody.trim()}>Post</Button>
              </div>
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              ) : (
                <div className="space-y-2">
                  {comments.map((c) => (
                    <div key={c.id} className="rounded-xl border border-border bg-card px-3 py-2.5">
                      <p className="text-sm">{c.body}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(c.createdAt).toLocaleDateString()}
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