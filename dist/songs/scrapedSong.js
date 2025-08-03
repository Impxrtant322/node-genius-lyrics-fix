"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScrapedSong = void 0;
const errors_1 = require("../errors");
const types_1 = require("../helpers/types");
const song_1 = require("./song");
class ScrapedSong {
    constructor(data) {
        this.data = data;
    }
    /**
     * Parses lyrics of the scraped track.
     * @example const Lyrics = await ScrapedSong.lyrics(true);
     */
    lyrics(removeChorus = false) {
        if (!(0, types_1.isBoolean)(removeChorus)) {
            throw new errors_1.InvalidTypeError("removeChorus", "boolean", typeof removeChorus);
        }
        const lyrics = ScrapedSong.parseLyricsDataBodyChildren(this.data.songPage.lyricsData.body.children);
        return removeChorus ? song_1.Song.removeChorus(lyrics) : lyrics;
    }
    static parseLyricsDataBodyChildren(children, inLyrics = false, excluded = false, started = false) {
        let out = "";
        const hasTrue = (attrs, key) => {
            if (!attrs)
                return false;
            const v = attrs[key];
            if (v == null)
                return false;
            const s = String(v).toLowerCase();
            return s === "true" || s === "1" || s === ""; // be liberal: some attrs are empty-string
        };
        const hasNoisyClass = (attrs) => {
            const cls = attrs?.["class"] || attrs?.["className"];
            if (!cls)
                return false;
            // Skip common non-lyric wrappers Genius uses for editorial/headers/footers
            return /(SongDescription|Lyrics__Header|Lyrics__Footer|Editorial|RichText|Header|Footnote)/i.test(cls);
        };
        const textLooksLikeSectionHeader = (s) => /\[[^\]]+\]/.test(s); // [Verse], [Chorus], etc.
        const nodeHasBrDescendant = (node) => {
            if (typeof node === "string")
                return false;
            if (node.tag === "br")
                return true;
            if (!node.children)
                return false;
            for (const c of node.children) {
                if (nodeHasBrDescendant(c))
                    return true;
            }
            return false;
        };
        const nodeTextSample = (node, limit = 200) => {
            let s = "";
            const walk = (n) => {
                if (s.length >= limit)
                    return;
                if (typeof n === "string") {
                    s += n;
                    return;
                }
                if (n.children)
                    for (const ch of n.children)
                        walk(ch);
            };
            walk(node);
            return s.slice(0, limit);
        };
        for (const node of children) {
            if (typeof node === "string") {
                if (inLyrics && !excluded && started)
                    out += node;
                continue;
            }
            const attrs = node.attributes;
            const isLyricsContainer = hasTrue(attrs, "data-lyrics-container");
            const isExcludedHere = hasTrue(attrs, "data-exclude-from-selection") ||
                hasTrue(attrs, "aria-hidden") ||
                hasNoisyClass(attrs);
            const nextInLyrics = inLyrics || isLyricsContainer;
            const nextExcluded = excluded || isExcludedHere;
            // Decide if we should "start" emitting here (first stanza-like block)
            let nextStarted = started;
            if (!started && nextInLyrics && !nextExcluded) {
                // Start when this subtree looks like a stanza: either has <br> lines,
                // or early text includes a [Section] header
                const looksLikeStanza = nodeHasBrDescendant(node) ||
                    textLooksLikeSectionHeader(nodeTextSample(node));
                if (looksLikeStanza)
                    nextStarted = true;
            }
            // Preserve line breaks only once we started within visible lyrics
            if ((node.tag === "br" || node.tag === "inread-ad") &&
                nextInLyrics &&
                !nextExcluded &&
                nextStarted) {
                out += "\n";
                continue;
            }
            if (node.children?.length) {
                out += this.parseLyricsDataBodyChildren(node.children, nextInLyrics, nextExcluded, nextStarted);
            }
        }
        // Cleanup: trim and normalize spacing
        return out
            .replace(/[ \t]+\n/g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim();
    }
}
exports.ScrapedSong = ScrapedSong;
