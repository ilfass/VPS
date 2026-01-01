document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Sitio de Fabián de Haro iniciado');

    updateLiveStatus();
    setInterval(updateLiveStatus, 60000); // Check every minute

    // Animate elements on scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    });

    document.querySelectorAll('.schedule-card').forEach(card => {
        observer.observe(card);
    });
});

function updateLiveStatus() {
    const now = new Date();
    const hours = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const liveStatus = document.getElementById('liveStatus');
    const statusText = liveStatus.querySelector('.status-text');
    const videoPlaceholder = document.getElementById('videoPlaceholder');
    const youtubePlayer = document.getElementById('youtubePlayer');

    // Logic: Live Mon-Fri between 20:00 and 22:00
    const isWeekDay = day >= 1 && day <= 5;
    const isLiveTime = hours >= 20 && hours < 22;

    // Override for demo purposes (always offline unless manually set)
    // To test "Live" mode, set this to true
    const forceLive = false;

    if ((isWeekDay && isLiveTime) || forceLive) {
        liveStatus.classList.add('live');
        statusText.textContent = 'EN VIVO';

        // If we had a specific video ID, we would set it here
        // youtubePlayer.src = "https://www.youtube.com/embed/live_stream?channel=CHANNEL_ID";
        // youtubePlayer.style.display = 'block';
        // videoPlaceholder.querySelector('.placeholder-content').style.display = 'none';
    } else {
        liveStatus.classList.remove('live');
        statusText.textContent = 'OFFLINE';
    }

    updateNextStreamInfo();
}

function updateNextStreamInfo() {
    const nextStreamTime = document.getElementById('nextStreamTime');
    const now = new Date();
    const hours = now.getHours();

    if (hours >= 22) {
        nextStreamTime.textContent = 'Mañana a las 20:00 ARG';
    } else if (hours < 20) {
        nextStreamTime.textContent = 'Hoy a las 20:00 ARG';
    } else {
        nextStreamTime.textContent = '¡En vivo ahora!';
    }
}
