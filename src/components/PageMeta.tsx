import { useEffect } from "react";
import { useLocation } from "react-router";
import { SITE_URL } from "@/lib/site";

// Sets the document title, meta description and canonical URL for the current screen.
export function PageMeta({ title, description }: { title: string; description: string }) {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", SITE_URL + pathname);
  }, [title, description, pathname]);

  return null;
}
