export async function markClip({ type, title, scene, next, url, note }) {
    try {
        await fetch('/control-api/api/clip/mark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: type || 'clip',
                title: title || null,
                scene: scene || null,
                next: next || null,
                url: url || null,
                note: note || null
            })
        });
    } catch (e) { }
}

