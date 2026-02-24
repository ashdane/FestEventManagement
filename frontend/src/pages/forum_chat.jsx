import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopNav from '../assets/TopNav';
import OrgTopNav from '../assets/OrgTopNav';
import useLogout from '../hooks/useLogout';
import useVerifyRoles from '../hooks/useVerifyRoles';
import EVENT_SERVICE from '../services/eventServices';
const ForumChat = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const { token_verification } = useVerifyRoles();
    const { LogoutLogic } = useLogout();
    const [role, setRole] = useState(null);
    const [eventName, setEventName] = useState('Event Forum');
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [replyTo, setReplyTo] = useState('');
    const [announcement, setAnnouncement] = useState(false);
    const [since, setSince] = useState(new Date().toISOString());
    const [newCount, setNewCount] = useState(0);
    const [notifPreview, setNotifPreview] = useState([]);
    const canModerate = role === 'OGR';
    const backPath = role === 'OGR' ? '/orgdash?view=create' : `/events/${eventId}`;
    const load = async () => {
        const d = await EVENT_SERVICE.getForum(token, eventId);
        setMessages(d.messages || []);
        setSince(new Date().toISOString());
    };
    useEffect(() => {
        const r = token_verification(token);
        if (!r) return LogoutLogic();
        setRole(r);
        (async () => {
            try {
                if (r === 'OGR') {
                    const d = await EVENT_SERVICE.getOrganizerEventDetails(token, eventId);
                    setEventName(d?.event?.event_name || 'Event Forum');
                } else if (r === 'PPT') {
                    const d = await EVENT_SERVICE.getEventDetails(token, eventId);
                    setEventName(d?.event?.event_name || 'Event Forum');
                } else {
                    return LogoutLogic();
                }
                await load();
            } catch (e) {
                alert(e.message || 'Unable to load forum');
                navigate(backPath);
            }
        })();
    }, [eventId]);
    useEffect(() => {
        const id = setInterval(async () => {
            try {
                const n = await EVENT_SERVICE.forumNotifications(token, eventId, since);
                if ((n.newCount || 0) > 0) {
                    setNewCount(n.newCount || 0);
                    setNotifPreview(n.latest || []);
                }
            } catch { }
        }, 5000);
        return () => clearInterval(id);
    }, [eventId, since]);
    const send = async () => {
        if (!text.trim()) return;
        try {
            await EVENT_SERVICE.postForum(token, eventId, { text: text.trim(), parentId: replyTo || null, isAnnouncement: announcement });
            setText('');
            setReplyTo('');
            setAnnouncement(false);
            await load();
            setNewCount(0);
        } catch (e) { alert(e.message); }
    };
    const reactWith = async (id, emoji) => {
        try {
            await EVENT_SERVICE.reactForum(token, eventId, id, emoji);
            await load();
        } catch (e) { alert(e.message); }
    };
    const pin = async (id, pinned) => {
        try {
            await EVENT_SERVICE.pinForum(token, eventId, id, !pinned);
            await load();
        } catch (e) { alert(e.message); }
    };
    const remove = async (id) => {
        try {
            await EVENT_SERVICE.deleteForum(token, eventId, id);
            setMessages((prev) => prev.filter((m) => m._id !== id));
        } catch (e) { alert(e.message); }
    };
    const msgMap = useMemo(() => new Map((messages || []).map((m) => [String(m._id), m])), [messages]);
    const threads = useMemo(() => {
        const roots = [];
        const byParent = new Map();
        (messages || []).forEach((m) => {
            const p = m.parentId ? String(m.parentId) : '';
            if (!p) roots.push(m);
            else byParent.set(p, [...(byParent.get(p) || []), m]);
        });
        const sortFn = (a, b) => {
            if (a.pinned !== b.pinned) return (b.pinned === true) - (a.pinned === true);
            return new Date(a.createdAt) - new Date(b.createdAt);
        };
        roots.sort(sortFn);
        byParent.forEach((arr, key) => byParent.set(key, arr.sort(sortFn)));
        return { roots, byParent };
    }, [messages]);
    const reactionSet = ['like', 'love', 'laugh', 'insightful'];
    const labelFor = { like: 'Like', love: 'Love', laugh: 'Laugh', insightful: 'Insightful' };
    const loadNotifications = async () => {
        await load();
        setNewCount(0);
        setNotifPreview([]);
    };
    return (
        <div className="page">
            {role === 'OGR' ? <OrgTopNav /> : <TopNav />}
            <div className="row">
                <button type="button" onClick={() => navigate(backPath)}>Go Back</button>
                {!!newCount && <p>New messages: {newCount}</p>}
                {!!newCount && <button type="button" onClick={loadNotifications}>Load New Messages</button>}
            </div>
            {!!newCount && (
                <div className="card">
                    <h3>Notifications</h3>
                    {(notifPreview || []).map((n, i) => <p key={`${n.createdAt}-${i}`}><strong>{n.authorName}</strong>: {n.text}</p>)}
                </div>
            )}
            <h2>{eventName} - Forum Chat</h2>
            <div className="forum-shell">
                <div className="forum-thread">
                    {threads.roots.map((m) => (
                        <div key={m._id} className={`chat-msg ${m.authorRole === role ? 'own' : ''}`}>
                            <p><strong>{m.pinned ? '[Pinned] ' : ''}{m.isAnnouncement ? '[Announcement] ' : ''}{m.authorName}</strong></p>
                            <p>{m.text}</p>
                            <div className="row">
                                <button type="button" onClick={() => setReplyTo(m._id)}>Reply</button>
                                {reactionSet.map((emoji) => (
                                    <button key={`${m._id}-${emoji}`} type="button" onClick={() => reactWith(m._id, emoji)}>
                                        {labelFor[emoji]} {(m.reactions || []).find((r) => r.emoji === emoji)?.users?.length || 0}
                                    </button>
                                ))}
                                {canModerate && <button type="button" onClick={() => pin(m._id, m.pinned)}>{m.pinned ? 'Unpin' : 'Pin'}</button>}
                                {canModerate && <button type="button" onClick={() => remove(m._id)}>Delete</button>}
                            </div>
                            {(threads.byParent.get(String(m._id)) || []).map((r) => (
                                <div key={r._id} className={`chat-msg ${r.authorRole === role ? 'own' : ''}`} style={{ marginLeft: 24 }}>
                                    <p><strong>{r.authorName}</strong> <small>(reply)</small></p>
                                    <p>{r.text}</p>
                                    <div className="row">
                                        <button type="button" onClick={() => setReplyTo(r._id)}>Reply</button>
                                        {reactionSet.map((emoji) => (
                                            <button key={`${r._id}-${emoji}`} type="button" onClick={() => reactWith(r._id, emoji)}>
                                                {labelFor[emoji]} {(r.reactions || []).find((x) => x.emoji === emoji)?.users?.length || 0}
                                            </button>
                                        ))}
                                        {canModerate && <button type="button" onClick={() => pin(r._id, r.pinned)}>{r.pinned ? 'Unpin' : 'Pin'}</button>}
                                        {canModerate && <button type="button" onClick={() => remove(r._id)}>Delete</button>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                <div className="forum-compose">
                    {replyTo && <p>Replying to: <strong>{msgMap.get(String(replyTo))?.authorName || 'message'}</strong>. <button type="button" onClick={() => setReplyTo('')}>Cancel</button></p>}
                    <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type message..." />
                    {canModerate && <label><input type="checkbox" checked={announcement} onChange={(e) => setAnnouncement(e.target.checked)} /> Post as announcement</label>}
                    <button type="button" onClick={send}>Send</button>
                </div>
            </div>
        </div>
    );
};
export default ForumChat;
