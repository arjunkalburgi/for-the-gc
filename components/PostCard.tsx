"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatDate } from "@/components/utls";
import type { PostMeta } from "@/components/notion/types";

type PostCardProps = {
    post: PostMeta;
    featured?: boolean;
};

export default function PostCard({ post, featured = false }: PostCardProps) {
    const cardRef = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        const card = cardRef.current;
        const container = card?.parentElement;
        if (!card || !container) {
            return;
        }

        if (
            typeof IntersectionObserver === "undefined" ||
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ) {
            return;
        }

        container.classList.add("posts--reveal-ready");
        const revealObserver = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                card.classList.add("post--visible");
                revealObserver.unobserve(card);
            }
        }, { threshold: 0.1 });

        revealObserver.observe(card);
        return () => {
            revealObserver.disconnect();
        };
    }, []);

    const classNames = [
        "post",
        featured && "post--featured",
        !post.hero && "post--no-image",
    ].filter(Boolean).join(" ");

    return (
        <Link ref={cardRef} className={classNames} href={`/${post.slug}`}>
            {post.hero && (
                <div className="post-art">
                    <Image
                        src={post.hero}
                        alt={post.title}
                        fill
                        sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 33vw"
                    />
                </div>
            )}
            <h4>{post.title}</h4>
            <p>{post.summary}</p>
            <p>
                <small>{formatDate(post.date)}</small>
            </p>
        </Link>
    );
}
