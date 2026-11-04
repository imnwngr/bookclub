import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useBlocker, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getEvent,
  listGuests,
  listInvitations,
  saveEvent,
} from "../features/events/api";
import {
  eventSchema,
  fromLocalInput,
  mapLink,
  toLocalInput,
} from "../lib/domain";
import { errorMessage } from "../lib/supabase";
import type { ClubEvent, EventInput, Guest, Invitation } from "../types/domain";
import { Empty, ErrorState, Loading } from "../components/Feedback";
import { GuestSelection } from "../features/guests/GuestSelection";
import { InvitationManager } from "../features/invitations/InvitationManager";
import { LocationPicker } from "../features/events/LocationPicker";
import { Confirm } from "../components/Confirm";
export default function EventForm() {
  const { eventCode } = useParams();
  const eq = useQuery({
    queryKey: ["event", eventCode],
    enabled: !!eventCode,
    queryFn: () => getEvent(eventCode!),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const guests = useQuery({ queryKey: ["guests"], queryFn: listGuests });
  const iq = useQuery({
    queryKey: ["invitations", eq.data?.id],
    enabled: !!eq.data?.id,
    queryFn: () => listInvitations(eq.data!.id),
  });
  if (
    guests.isPending ||
    (eventCode && (eq.isPending || (eq.data && iq.isPending)))
  )
    return <Loading />;
  const error = guests.error || eq.error || iq.error;
  if (error)
    return (
      <ErrorState
        error={error}
        retry={() => {
          void guests.refetch();
          if (eventCode) void eq.refetch();
          if (eq.data) void iq.refetch();
        }}
      />
    );
  if (eventCode && !eq.data) return <Empty>Không tìm thấy sự kiện.</Empty>;
  return (
    <EventEditor
      key={eq.data?.updated_at ?? "new"}
      event={eq.data ?? undefined}
      guests={guests.data!}
      invitations={iq.data ?? []}
    />
  );
}
function EventEditor({
  event,
  guests,
  invitations,
}: {
  event?: ClubEvent;
  guests: Guest[];
  invitations: Invitation[];
}) {
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [selected, setSelected] = useState(invitations.map((i) => i.guest_id));
  const [selectionDirty, setSelectionDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const form = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: event ?? {
      code: `sk-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8)}`,
      title: "",
      description: "",
      starts_at: "",
      ends_at: "",
      status: "draft",
      venue_name: "",
      address: "",
      directions: "",
      latitude: null,
      longitude: null,
      place_id: "",
      maps_url: "",
    },
  });
  const {
    register,
    watch,
    setValue,
    formState: { errors, isDirty },
    handleSubmit,
  } = form;
  const dirty = isDirty || selectionDirty;
  const blocker = useBlocker(dirty && !saving);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (dirty && !saving) e.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty, saving]);
  const field = (name: keyof EventInput, label: string, type = "text") => (
    <label>
      {label}
      <input type={type} {...register(name)} aria-invalid={!!errors[name]} />
      {errors[name] && (
        <span className="field-error">{errors[name]?.message}</span>
      )}
    </label>
  );
  const url = mapLink({
    latitude: watch("latitude"),
    longitude: watch("longitude"),
    address: watch("address"),
    maps_url: watch("maps_url"),
    place_id: watch("place_id"),
  });
  return (
    <section className="editor">
      <Link to="/admin/">Về danh sách quản trị</Link>
      <h1>{event ? "Chỉnh sửa sự kiện" : "Thêm sự kiện"}</h1>
      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          setSaving(true);
          try {
            const saved = await saveEvent(values, selected, event);
            form.reset(saved);
            setSelectionDirty(false);
            await cache.invalidateQueries();
            toast.success("Đã lưu sự kiện");
            navigate(`/admin/edit/${saved.code}`, { replace: true });
          } catch (err) {
            toast.error(errorMessage(err));
          } finally {
            setSaving(false);
          }
        })}
      >
        <fieldset>
          <legend>Thông tin sự kiện</legend>
          {field("title", "Tên sự kiện *")}
          <label>
            Mô tả
            <textarea rows={5} {...register("description")} />
            {errors.description && (
              <span className="field-error">{errors.description.message}</span>
            )}
          </label>
          <label>
            Mã sự kiện *
            <input
              {...register("code")}
              readOnly={!!event}
              aria-invalid={!!errors.code}
            />
            {errors.code && (
              <span className="field-error">{errors.code.message}</span>
            )}
            <small>
              {event
                ? "Mã cố định để giữ nguyên các liên kết."
                : "Có thể chỉnh mã trước khi tạo."}
            </small>
          </label>
          <div className="form-grid">
            {(["starts_at", "ends_at"] as const).map((name) => (
              <label key={name}>
                {name === "starts_at" ? "Bắt đầu *" : "Kết thúc *"}
                <input
                  type="datetime-local"
                  value={watch(name) ? toLocalInput(watch(name)) : ""}
                  onChange={(e) => {
                    try {
                      setValue(name, fromLocalInput(e.target.value), {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    } catch {
                      setValue(name, "", { shouldValidate: true });
                    }
                  }}
                  aria-invalid={!!errors[name]}
                />
                {errors[name] && (
                  <span className="field-error">{errors[name].message}</span>
                )}
              </label>
            ))}
          </div>
          <p className="footnote">
            Nhập giờ Việt Nam (UTC+7). Dữ liệu lưu theo UTC.
          </p>
          <label>
            Trạng thái
            <select {...register("status")}>
              <option value="draft">Bản nháp</option>
              <option value="published">Công bố</option>
            </select>
          </label>
        </fieldset>
        <fieldset>
          <legend>Địa điểm</legend>
          <LocationPicker
            initial={{
              latitude: event?.latitude ?? null,
              longitude: event?.longitude ?? null,
            }}
            onPick={(picked) => {
              for (const [name, value] of Object.entries(picked))
                setValue(name as keyof EventInput, value, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
            }}
          />
          {field("venue_name", "Tên địa điểm")}
          {field("address", "Địa chỉ")}
          <label>
            Hướng dẫn vị trí
            <textarea {...register("directions")} />
          </label>
          <div className="form-grid">
            {(["latitude", "longitude"] as const).map((name) => (
              <label key={name}>
                {name === "latitude" ? "Vĩ độ" : "Kinh độ"}
                <input
                  type="number"
                  step="any"
                  {...register(name, {
                    setValueAs: (v) =>
                      v === "" || v == null ? null : Number(v),
                  })}
                  aria-invalid={!!errors[name]}
                />
                {errors[name] && (
                  <span className="field-error">{errors[name].message}</span>
                )}
              </label>
            ))}
          </div>
          {field("place_id", "Google Place ID (tùy chọn)")}
          {field("maps_url", "Liên kết Google Maps (tùy chọn)", "url")}
          {url && (
            <a target="_blank" rel="noopener noreferrer" href={url}>
              Xem trước vị trí trên Google Maps
            </a>
          )}
        </fieldset>
        <GuestSelection
          guests={guests}
          selected={selected}
          onChange={(ids) => {
            setSelected(ids);
            setSelectionDirty(true);
          }}
        />
        <div className="save-bar">
          <span aria-live="polite">
            {dirty
              ? "Có thay đổi chưa lưu"
              : event
                ? "Nội dung đã đồng bộ"
                : "Nhập thông tin để tạo sự kiện"}
          </span>
          <button disabled={saving}>
            {saving ? "Đang lưu…" : "Lưu sự kiện"}
          </button>
        </div>
      </form>
      {event && (
        <InvitationManager invitations={invitations} code={event.code} />
      )}
      {blocker.state === "blocked" && (
        <Confirm
          title="Rời trang khi chưa lưu?"
          onClose={() => blocker.reset()}
          onConfirm={() => blocker.proceed()}
        >
          Thay đổi chưa lưu sẽ bị mất.
        </Confirm>
      )}
    </section>
  );
}
