"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useRef, useState } from "react";
import { getVenue, keepDots, type VenuePhoto } from "@/lib/hackathon-2026";
import { cn } from "@/lib/utils";

const controlClass =
  "inline-flex h-11 w-11 items-center justify-center border border-white/20 bg-black/70 text-white transition-colors hover:border-white cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

/**
 * Venue photos with visible credits. Tap a photo to open it full screen;
 * arrow keys / buttons move between photos, Escape closes and focus returns
 * to the photo that was opened.
 */
export function PhotoGallery({ photos }: { photos: readonly VenuePhoto[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const openers = useRef<(HTMLButtonElement | null)[]>([]);
  const lastOpened = useRef(0);
  const current = index === null ? null : photos[index];

  const go = (delta: number) => setIndex((i) => (i === null ? i : (i + delta + photos.length) % photos.length));

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo, i) => (
          <li key={photo.id} className="guide-avoid-break">
            <figure className="flex h-full flex-col border border-white/10">
              <button
                ref={(el) => {
                  openers.current[i] = el;
                }}
                type="button"
                onClick={() => {
                  lastOpened.current = i;
                  setIndex(i);
                }}
                className="group relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
                aria-label={`Open photo: ${photo.caption}`}
              >
                <Image
                  src={photo.srcCard}
                  alt={photo.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
                <span className="absolute left-3 top-3 bg-black/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white">
                  {getVenue(photo.venue).name}
                </span>
              </button>
              <figcaption className="flex-1 border-t border-white/10 p-4">
                <p className="text-sm text-neutral-300 leading-relaxed">{photo.caption}</p>
                <p className="mt-2 text-[11px] text-white/55">{keepDots(photo.credit)}</p>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      <Dialog.Root
        open={current !== null}
        onOpenChange={(open) => {
          if (!open) setIndex(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/95" />
          <Dialog.Content
            className="fixed inset-0 z-[71] flex flex-col bg-black text-white outline-none"
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                go(1);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                go(-1);
              }
            }}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              openers.current[lastOpened.current]?.focus();
            }}
          >
            {current && (
              <>
                <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-white/10 pl-4 pr-2">
                  <Dialog.Title className="min-w-0 truncate text-sm font-bold">
                    {getVenue(current.venue).name}&nbsp;· {index! + 1} / {photos.length}
                  </Dialog.Title>
                  <Dialog.Close className={controlClass} aria-label="Close photo">
                    <X className="h-5 w-5" aria-hidden="true" />
                  </Dialog.Close>
                </div>
                <div className="relative min-h-0 flex-1">
                  <Image
                    key={current.id}
                    src={current.src}
                    alt={current.alt}
                    fill
                    sizes="100vw"
                    className="object-contain"
                  />
                  {photos.length > 1 && (
                    <>
                      <button
                        type="button"
                        className={cn(controlClass, "absolute left-3 top-1/2 -translate-y-1/2")}
                        onClick={() => go(-1)}
                        aria-label="Previous photo"
                      >
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={cn(controlClass, "absolute right-3 top-1/2 -translate-y-1/2")}
                        onClick={() => go(1)}
                        aria-label="Next photo"
                      >
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
                <Dialog.Description asChild>
                  <div className="shrink-0 border-t border-white/10 px-4 py-3">
                    <p className="text-sm text-neutral-200">{current.caption}</p>
                    <p className="mt-1 text-[11px] text-white/55">{keepDots(current.credit)}</p>
                  </div>
                </Dialog.Description>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
