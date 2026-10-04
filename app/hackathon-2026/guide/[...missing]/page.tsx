import { notFound } from "next/navigation";

/** Any unknown URL under the guide renders the guide's own 404 page. */
export default function MissingGuidePage() {
  notFound();
}
