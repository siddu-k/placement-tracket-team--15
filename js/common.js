// ========== HELPER FUNCTIONS ==========
function filterByPackage(pkg, range) {
    if (range === '0-10') return pkg >= 0 && pkg <= 10;
    if (range === '10-20') return pkg > 10 && pkg <= 20;
    if (range === '20-40') return pkg > 20 && pkg <= 40;
    if (range === '40+') return pkg > 40;
    return true;
}

function getDaysUntilDeadline(deadline) {
    const today = new Date('2026-01-05');
    const deadlineDate = new Date(deadline);
    const diff = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));
    return diff;
}

function formatDeadline(deadline) {
    const date = new Date(deadline);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
