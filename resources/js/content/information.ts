/**
 * The copy for Clover's four standing pages.
 *
 * Kept apart from the component so the words can be read, reviewed and tested
 * as words. Everything here is a statement about how this application actually
 * behaves, and several of the claims are checkable in the code: Clover writes
 * nothing upstream because 4chan's API accepts `GET`, `HEAD` and `OPTIONS`
 * only; it stores no mirrored files, because those are hotlinked from 4chan's
 * CDN, and the only file it does hold is an image an anon attached to a reply
 * written here;
 * a post carries no identity because `posts.user_id` is never rendered to
 * anyone but its author.
 *
 * If one of those stops being true, the page here is wrong and has to change
 * with it. That is the cost of writing a real page instead of a placeholder,
 * and it is the right cost.
 */
export type InformationSection = {
    heading: string;
    body: readonly string[];
};

export type InformationPage = {
    /** Sits under the title. One sentence on what the page is for. */
    summary: string;
    sections: readonly InformationSection[];
};

export const INFORMATION: Record<string, InformationPage> = {
    Rules: {
        summary:
            'Four of them, and a janitor reads every report. They apply to what anons post here, not to what Clover mirrors from 4chan.',
        sections: [
            {
                heading: 'Post on topic for the board you are on',
                body: [
                    'Boards exist because subjects do. A thread that would fit any board belongs on none of them.',
                ],
            },
            {
                heading: 'No doxxing, no raids, no illegal content',
                body: [
                    'Personal information about a real person, organised brigading of another site, and anything unlawful are all removed on sight, and the account that posted them goes with it.',
                ],
            },
            {
                heading: 'Spoiler anything that needs it',
                body: [
                    'Clover hides attachments on boards 4chan marks not worksafe, and honours the spoiler flag on individual posts. Neither is a substitute for judgement about what you attach.',
                ],
            },
            {
                heading: 'Reports are read by janitors, not bots',
                body: [
                    'A human reads every report and their actions are logged. There is no automated removal, so nothing disappears without somebody having decided it should.',
                ],
            },
        ],
    },

    FAQ: {
        summary:
            'What Clover is, where the content comes from, and what an account changes.',
        sections: [
            {
                heading: 'Is this 4chan?',
                body: [
                    'No. Clover is a separate application that reads 4chan through its public JSON API and renders it in a different interface. The boards, threads and posts you read here were written on 4chan.',
                ],
            },
            {
                heading: 'Does anything I do here reach 4chan?',
                body: [
                    'No. 4chan’s API accepts GET, HEAD and OPTIONS only, so there is no way to write to it and Clover never tries. A reply written on Clover stays on Clover, and 4chan never learns you exist.',
                ],
            },
            {
                heading: 'Do I need an account?',
                body: [
                    'Not to read. Every board, thread and post is public and none of it is behind a sign-in. An account exists so that replying, saving threads, following boards and reading history have somewhere to live.',
                ],
            },
            {
                heading: 'Are my posts anonymous?',
                body: [
                    'Yes. A post written here is signed Anonymous whoever wrote it, and the account that wrote it is never shown to anyone else. The only name that can appear beside a post is a tripcode, which is something you opt into.',
                ],
            },
            {
                heading: 'Where are the images stored?',
                body: [
                    'Mirrored images stay on 4chan. Clover stores the identifier of the file, never the file, and your browser fetches it from 4chan’s servers directly — nothing is copied off 4chan.',
                    'An image you attach to a reply you write here is the one exception, and it is stored on Clover, because 4chan has never seen it and cannot serve it. It is the only file Clover holds.',
                ],
            },
            {
                heading: 'Why can I not see some boards?',
                body: [
                    'Boards 4chan marks not worksafe are hidden until you turn them on, which needs an account. It changes what the directory lists, not what is on the boards themselves.',
                ],
            },
        ],
    },

    Terms: {
        summary:
            'The short version: read what you like, own what you post, and expect nothing.',
        sections: [
            {
                heading: 'What Clover provides',
                body: [
                    'An interface onto publicly available 4chan content, and somewhere to write and save things of your own. It is provided as it is, with no guarantee that it works, stays available, or keeps anything you leave here.',
                ],
            },
            {
                heading: 'Content that is not ours',
                body: [
                    'Threads and posts mirrored from 4chan belong to whoever wrote them and are subject to 4chan’s own rules. Clover neither claims them nor vouches for them.',
                    'Mirrored attachments are served from 4chan’s servers rather than copied here: Clover holds the identifier of the file, not the file. An image attached to a reply written on Clover is stored here, because there is nowhere else it could come from.',
                ],
            },
            {
                heading: 'Content that is yours',
                body: [
                    'Anything you write on Clover stays yours. Posting it here grants no ownership and no licence beyond displaying it on this site.',
                ],
            },
            {
                heading: 'Losing your account',
                body: [
                    'Breaking the rules can cost you your account. Deleting it yourself is permanent, and because your posts carry no reference to it, they stay on the boards after it goes.',
                ],
            },
        ],
    },

    Privacy: {
        summary:
            'What Clover keeps, what it never had, and who can see it. The list is short on purpose.',
        sections: [
            {
                heading: 'What an account stores',
                body: [
                    'An email address and a password, which are how you sign in. Optionally a handle, a tripcode and a short bio, which are yours to set and yours to remove.',
                    'Alongside that: the threads you saved, the boards you follow, the threads you have read, and anything you posted. All of it is private to you.',
                ],
            },
            {
                heading: 'What is visible to other people',
                body: [
                    'Nothing except the text of what you post, signed Anonymous. Saved threads, followed boards and reading history are visible to nobody else, and no post carries a reference back to the account that wrote it.',
                ],
            },
            {
                heading: 'What Clover does not do',
                body: [
                    'There is no advertising, no third-party analytics and no tracking script on any page. Nothing about you is sent to 4chan, which cannot receive it in any case, and nothing is sold or shared with anybody.',
                ],
            },
            {
                heading: 'Images and your browser',
                body: [
                    'Mirrored attachments load from 4chan’s content servers rather than from Clover, so 4chan sees those requests the same way it would if you visited it directly. That is how hotlinking works everywhere, and it is worth knowing rather than burying.',
                    'An image you attach to your own reply is served by Clover and 4chan never sees it. It is deleted with the account that posted it.',
                ],
            },
            {
                heading: 'Deleting what you leave',
                body: [
                    'Deleting your account removes it and everything private attached to it. Posts stay, because they were anonymous the whole time and carry nothing that points back to you.',
                ],
            },
        ],
    },
};
