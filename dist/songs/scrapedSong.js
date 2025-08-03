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
    static parseLyricsDataBodyChildren(children, inLyrics = false, excluded = false) {
        let out = "";
        // helper: read boolean-ish attributes safely
        const hasTrueAttr = (obj, key) => {
            if (!obj)
                return false;
            const v = obj[key];
            if (v == null)
                return false;
            // Genius tends to use "true" (string). Be liberal just in case.
            return v === "true" || v === "1" || v === "" || v.toLowerCase?.() === "true";
        };
        for (const node of children) {
            if (typeof node === "string") {
                if (inLyrics && !excluded)
                    out += node;
                continue;
            }
            const attrs = node.attributes;
            const isLyricsContainer = hasTrueAttr(attrs, "data-lyrics-container");
            // Editorial blurbs / headers are marked like this
            const isExcludedHere = hasTrueAttr(attrs, "data-exclude-from-selection");
            const nextInLyrics = inLyrics || isLyricsContainer;
            const nextExcluded = excluded || isExcludedHere;
            // keep line breaks only for visible lyric content
            if ((node.tag === "br" || node.tag === "inread-ad") && nextInLyrics && !nextExcluded) {
                out += "\n";
                continue;
            }
            if (node.children?.length) {
                out += this.parseLyricsDataBodyChildren(node.children, nextInLyrics, nextExcluded);
            }
        }
        // tidy up: collapse big gaps, trim edges
        return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    }
}
exports.ScrapedSong = ScrapedSong;
