import fs from "node:fs";
import path from "node:path";
import "./page.css";
import type { PostMeta } from "@/components/notion/types";
import PostCard from "@/components/PostCard";

export default function Home() {
    const file = path.join(process.cwd(), "data", "index.json");
    const posts: PostMeta[] = JSON.parse(fs.readFileSync(file, "utf8"));
    const listedPosts = posts.filter((post) => !post.unlisted);
    
    const hero = listedPosts.length > 0 ? listedPosts[0] : null;
    const rest = hero ? listedPosts.slice(1) : listedPosts;
    
    return (
        <main>
            <div className="intro">
                <h2>For the Group Chat</h2>
                <p>
                    I think by building frameworks, even if it&apos;s for getting dressed or getting out of bed. This is where I write
                    them down, so I can send them to the group chat. Together we can work out better ways to connect with 
                    ourselves, each other and live our lives.
                </p>
            </div>

            <section className="content">
                <div className="posts">
                {hero && (
                    <PostCard post={hero} featured />
                )}

                {rest.map((post) => (
                    <PostCard key={post.slug} post={post} />
                ))}
                </div>
            </section>
        </main>
    );
}
