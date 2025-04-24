
 document.addEventListener('DOMContentLoaded', function() {
    const formGroups = document.querySelectorAll('.form-group');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                entry.target.style.animation = `fadeInUp 0.5s ease-out ${index * 0.1}s forwards`;
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });
    
    formGroups.forEach(group => {
        group.style.opacity = '0';
        observer.observe(group);
    });
});