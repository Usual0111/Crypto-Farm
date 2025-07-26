// Firebase конфигурация 
const firebaseConfig = {
  apiKey: "AIzaSyA82ux8W1khadz3sU6r9m6m3hs7qUcUafs",
  authDomain: "crypto-farmer-c2783.firebaseapp.com",
  projectId: "crypto-farmer-c2783",
  storageBucket: "crypto-farmer-c2783.firebasestorage.app",
  messagingSenderId: "103318616150",
  appId: "1:103318616150:web:eb6e6d7a24aa6b45d1a3f7"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Слушатель состояния авторизации
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Пользователь авторизован
        try {
            // Загружаем данные пользователя из Firestore
            const userDoc = await db.collection('users').doc(user.uid).get();
            let userName = user.email.split('@')[0]; // По умолчанию
            
            if (userDoc.exists) {
                userName = userDoc.data().name || userName;
            }
            
            currentUser = {
                id: user.uid,
                name: userName,
                email: user.email
            };
            isLoggedIn = true;
            
            // Показываем интерфейс
            document.getElementById('auth-section').classList.add('hidden');
            document.getElementById('main-content').classList.remove('hidden');
            document.getElementById('navigation').classList.remove('hidden');
            document.getElementById('user-panel').classList.remove('hidden');
            document.getElementById('current-user-name').textContent = currentUser.name;
            
            // Загружаем проекты пользователя
            await loadUserFarm();
            await loadProjectsFromFirebase();
            updateFarmStats();
            renderFarmProjects();
            
            showNotification(`Добро пожаловать, ${currentUser.name}! 🎉`);
        } catch (error) {
            console.error('Ошибка загрузки данных пользователя:', error);
        }
    } else {
        // Пользователь не авторизован
        isLoggedIn = false;
        currentUser = null;
        farmProjects = [];
        
        // Показываем форму авторизации
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('main-content').classList.add('hidden');
        document.getElementById('navigation').classList.add('hidden');
        document.getElementById('user-panel').classList.add('hidden');
        
        showPage('home');
    }
});

// Админ-функции
const ADMIN_EMAIL = 'plyxlux@gmail.com'; // Замени на свой email
let isAdmin = false;
let currentEditingProject = null;
let uploadedImages = {};

// Проверка админских прав
function checkAdminRights() {
    const user = firebase.auth().currentUser;
    if (user && user.email === ADMIN_EMAIL) {
        isAdmin = true;
        showAdminControls();
    } else {
        isAdmin = false;
        hideAdminControls();
    }
}

function showAdminControls() {
    document.querySelectorAll('.admin-controls').forEach(el => el.classList.add('show'));
    addAdminButtonsToProjects();
    addAdminButtonsToNews();
}

function hideAdminControls() {
    document.querySelectorAll('.admin-controls').forEach(el => el.classList.remove('show'));
    removeAdminButtonsFromProjects();
    removeAdminButtonsFromNews();
}

// Добавление админ-кнопок к проектам
function addAdminButtonsToProjects() {
    document.querySelectorAll('.project-card').forEach(card => {
        if (!card.querySelector('.admin-project-controls')) {
            const adminControls = document.createElement('div');
            adminControls.className = 'admin-project-controls admin-controls show';
            adminControls.innerHTML = `
                <button class="admin-btn" onclick="editProject(this)">✏️ Редактировать</button>
            `;
            card.appendChild(adminControls);
        }
    });
}

function removeAdminButtonsFromProjects() {
    document.querySelectorAll('.admin-project-controls').forEach(el => el.remove());
}

// Добавление админ-кнопок к новостям
function addAdminButtonsToNews() {
    document.querySelectorAll('.news-card').forEach(card => {
        if (!card.querySelector('.admin-news-controls')) {
            const adminControls = document.createElement('div');
            adminControls.className = 'admin-news-controls admin-controls show';
            adminControls.innerHTML = `
                <button class="admin-btn" onclick="deleteNews(this)" style="background: #ff6b6b;">🗑 Удалить</button>
            `;
            card.appendChild(adminControls);
        }
    });
}

function removeAdminButtonsFromNews() {
    document.querySelectorAll('.admin-news-controls').forEach(el => el.remove());
}

// Функции для работы с изображениями
function handleImageUpload(input, type) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedImages[type] = e.target.result;
            
            if (type === 'new-project') {
                const preview = document.getElementById('new-project-preview');
                preview.src = e.target.result;
                preview.style.display = 'block';
            } else if (type === 'project') {
                const currentImage = document.getElementById('current-project-image');
                currentImage.src = e.target.result;
            }
        };
        reader.readAsDataURL(file);
    }
}

// Модальные окна
function openAddProjectModal() {
    document.getElementById('add-project-modal').classList.remove('hidden');
}

function closeAddProjectModal() {
    document.getElementById('add-project-modal').classList.add('hidden');
    clearAddProjectForm();
}

function openAddNewsModal() {
    document.getElementById('add-news-modal').classList.remove('hidden');
}

function closeAddNewsModal() {
    document.getElementById('add-news-modal').classList.add('hidden');
    clearAddNewsForm();
}

function clearAddProjectForm() {
    document.getElementById('new-project-name').value = '';
    document.getElementById('new-project-reward').value = '';
    document.getElementById('new-project-deadline').value = '';
    document.getElementById('new-project-link').value = '';
    document.getElementById('new-project-checklist').value = '';
    document.getElementById('new-project-preview').style.display = 'none';
    delete uploadedImages['new-project'];
}

function clearAddNewsForm() {
    document.getElementById('new-news-title').value = '';
    document.getElementById('new-news-content').value = '';
    document.getElementById('new-news-date').value = '';
}

// Вызывать проверку админских прав при входе
firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        checkAdminRights();
    }
});

// Глобальные переменные
let currentPage = 'home';
let isLoggedIn = false;
let currentUser = null;
let farmProjects = [];
let notifications = [];

// Данные проектов
const projects = [
    {
        id: 1,
        name: "DeFi Yield",
        type: "DeFi",
        reward: "$10-$50",
        deadline: "15 дней",
        difficulty: "Легко",
        popular: 847,
        planted: false,
        progress: 0,
        icon: "🌱"
    },
    {
        id: 2,
        name: "NFT Drops",
        type: "NFT",
        reward: "$25-$100",
        deadline: "7 дней",
        difficulty: "Средне",
        popular: 623,
        planted: false,
        progress: 0,
        icon: "🌸"
    },
    {
        id: 3,
        name: "GameFi Token",
        type: "GameFi",
        reward: "$5-$30",
        deadline: "21 день",
        difficulty: "Легко",
        popular: 1205,
        planted: false,
        progress: 0,
        icon: "🌿"
    },
    {
        id: 4,
        name: "Staking Rewards",
        type: "DeFi",
        reward: "$15-$75",
        deadline: "10 дней",
        difficulty: "Средне",
        popular: 934,
        planted: false,
        progress: 0,
        icon: "🌾"
    },
    {
        id: 5,
        name: "Meta NFT",
        type: "NFT",
        reward: "$20-$120",
        deadline: "5 дней",
        difficulty: "Сложно",
        popular: 512,
        planted: false,
        progress: 0,
        icon: "🎨"
    },
    {
        id: 6,
        name: "Play2Earn",
        type: "GameFi",
        reward: "$8-$40",
        deadline: "14 дней",
        difficulty: "Легко",
        popular: 1456,
        planted: false,
        progress: 0,
        icon: "🎮"
    }
];

// Новости
const news = [
    {
        id: 1,
        title: "Новый аирдроп DeFi проекта!",
        content: "Проект Y запустил новый аирдроп с наградой до $50! Успейте принять участие.",
        time: "2 часа назад"
    },
    {
        id: 2,
        title: "Осталось 3 дня!",
        content: "До завершения аирдропа проекта Z осталось всего 3 дня. Не упустите возможность!",
        time: "5 часов назад"
    },
    {
        id: 3,
        title: "Новая игра в GameFi!",
        content: "Запущена новая блокчейн-игра с токенами наград. Раннее участие даёт бонусы!",
        time: "1 день назад"
    },
    {
        id: 4,
        title: "NFT коллекция готова!",
        content: "Популярная NFT коллекция готовится к минту. Whitelisted пользователи получат скидку.",
        time: "2 дня назад"
    }
];

document.addEventListener('DOMContentLoaded', async function() {
    await initializeApp();
    setupEventListeners();
    startProgressUpdater();
});

async function initializeApp() {
    await loadProjectsFromFirebase(); // Ждем загрузки
    renderPopularProjects();
    renderNews();
    renderStoreProjects();
    updateFarmStats();
    renderFarmProjects();
    renderFullNewsList();
}

function setupEventListeners() {
    // Авторизация
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('register-btn').addEventListener('click', handleRegister);
    document.getElementById('show-register').addEventListener('click', showRegisterForm);
    document.getElementById('show-login').addEventListener('click', showLoginForm);
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // Навигация
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const page = this.dataset.page;
            showPage(page);
        });
    });
    
    // Фильтры в витрине
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const filter = this.dataset.filter;
            filterProjects(filter);
            
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showNotification('Заполните все поля!');
        return;
    }
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        // Пользователь автоматически войдет через onAuthStateChanged
    } catch (error) {
        console.error('Ошибка входа:', error);
        showNotification('Неверный email или пароль!');
    }
}

async function handleRegister() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;
    
    if (!name || !email || !password || !confirmPassword) {
        showNotification('Заполните все поля!');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Пароли не совпадают!');
        return;
    }
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Сохраняем имя пользователя в Firestore
        await db.collection('users').doc(user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Пользователь автоматически войдет через onAuthStateChanged
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        if (error.code === 'auth/email-already-in-use') {
            showNotification('Пользователь с таким email уже существует!');
        } else {
            showNotification('Ошибка при регистрации!');
        }
    }
}

async function logout() {
    try {
        await auth.signOut();
        // Остальное произойдет через onAuthStateChanged
    } catch (error) {
        console.error('Ошибка выхода:', error);
        showNotification('Ошибка при выходе');
    }
}

function showRegisterForm() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
}

function showLoginForm() {
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
}

function showPage(page) {
    // Скрываем все страницы
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Показываем нужную страницу
    document.getElementById(page + '-page').classList.add('active');
    
    // Обновляем активную кнопку навигации
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-page="${page}"]`).classList.add('active');
    
    currentPage = page;
    
    // Обновляем содержимое страницы
    if (page === 'farm') {
        updateFarmStats();
        renderFarmProjects();
    }
}

function renderPopularProjects() {
    const container = document.getElementById('popular-projects');
    const topProjects = projects.slice(0, 3);
    
    container.innerHTML = topProjects.map(project => `
        <div class="project-card">
            <div class="text-center">
                <div class="project-icon">${project.icon}</div>
                <h3 class="project-name">${project.name}</h3>
                <span class="project-type">${project.type}</span>
            </div>
            <div class="project-info">
                <div class="project-info-row">
                    <span class="project-info-label">Награда:</span>
                    <span class="project-info-value project-reward">${project.reward}</span>
                </div>
                <div class="project-info-row">
                    <span class="project-info-label">Популярность:</span>
                    <span class="project-info-value project-popularity">${project.popular}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function renderNews() {
    const container = document.getElementById('news-list');
    const topNews = news.slice(0, 2);
    
    container.innerHTML = topNews.map(item => `
        <div class="news-item">
            <h4 class="news-title">${item.title}</h4>
            <p class="news-content">${item.content}</p>
            <p class="news-time">${item.time}</p>
        </div>
    `).join('');
}

function renderStoreProjects() {
    const container = document.getElementById('store-projects');
    
    container.innerHTML = projects.map(project => `
        <div class="project-card" data-type="${project.type.toLowerCase()}">
            <div class="text-center">
                <div class="project-icon">${project.icon}</div>
                <h3 class="project-name">${project.name}</h3>
                <span class="project-type">${project.type}</span>
            </div>
            <div class="project-info">
                <div class="project-info-row">
                    <span class="project-info-label">Награда:</span>
                    <span class="project-info-value project-reward">${project.reward}</span>
                </div>
                <div class="project-info-row">
                    <span class="project-info-label">Дедлайн:</span>
                    <span class="project-info-value">${project.deadline}</span>
                </div>
                <div class="project-info-row">
                    <span class="project-info-label">Сложность:</span>
                    <span class="project-info-value">${project.difficulty}</span>
                </div>
                <div class="project-info-row">
                    <span class="project-info-label">Популярность:</span>
                    <span class="project-info-value project-popularity">${project.popular}</span>
                </div>
            </div>
            <button class="btn-secondary" onclick="plantProject(${project.id})" style="width: 100%;">
                🌱 Посадить
            </button>
        </div>
    `).join('');
}

function filterProjects(filter) {
    const cards = document.querySelectorAll('#store-projects .project-card');
    
    cards.forEach(card => {
        if (filter === 'all' || card.dataset.type === filter) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function plantProject(projectId) {
    if (!isLoggedIn) {
        showNotification('Войдите в систему для посадки проектов!');
        return;
    }
    
    const project = projects.find(p => p.id === projectId);
    
    if (project) {
        showProjectModal(project);
    }
}
       
async function saveUserProgress() {
    await saveToStorage();
}

async function saveToStorage() {
    if (!currentUser || !isLoggedIn) return;
    
    try {
        await db.collection('userFarms').doc(currentUser.id).set({
            projects: farmProjects,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Данные сохранены в Firestore');
    } catch (error) {
        console.error('Ошибка сохранения:', error);
    }
}

async function loadUserFarm() {
    if (!currentUser || !isLoggedIn) return;
    
    try {
        const doc = await db.collection('userFarms').doc(currentUser.id).get();
        if (doc.exists) {
            const data = doc.data();
            farmProjects = data.projects || [];
        } else {
            farmProjects = [];
        }
        console.log('Данные загружены из Firestore');
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        farmProjects = [];
    }
}

function harvestProject(projectId) {
    const projectIndex = farmProjects.findIndex(p => p.id === projectId);
    
    if (projectIndex !== -1) {
        const project = farmProjects[projectIndex];
        const reward = Math.floor(Math.random() * 40) + 10;
        
        farmProjects.splice(projectIndex, 1);
        updateFarmStats();
        renderFarmProjects();
        
        showNotification(`Урожай собран! Получено ${reward} токенов от "${project.name}" 🎯`);
    }
}

function updateFarmStats() {
    const projectsCount = farmProjects.length;
    const readyCount = farmProjects.filter(p => p.progress >= 100).length;
    
    document.getElementById('projects-count').textContent = projectsCount;
    document.getElementById('ready-count').textContent = readyCount;
    
    // Показываем/скрываем пустое состояние
    const emptyState = document.getElementById('empty-farm');
    const farmProjectsContainer = document.getElementById('farm-projects');
    
    if (projectsCount === 0) {
        emptyState.style.display = 'block';
        farmProjectsContainer.style.display = 'none';
    } else {
        emptyState.style.display = 'none';
        farmProjectsContainer.style.display = 'grid';
    }
}

function renderFarmProjects() {
    const container = document.getElementById('farm-projects');
    
    container.innerHTML = farmProjects.map(project => `
        <div class="project-card">
            <div class="text-center">
                <div class="project-icon">${project.icon}</div>
                <h3 class="project-name">${project.name}</h3>
            </div>
            <div class="progress-info">
                <span class="project-info-label">Прогресс:</span>
                <span class="project-info-value">${Math.round(project.progress)}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${project.progress}%"></div>
            </div>
            <div class="text-center">
                ${project.progress >= 100 ? 
                    `<button class="btn-harvest" onclick="harvestProject(${project.id})">
                        🎯 Собрать урожай
                    </button>` :
                    `<div class="progress-status">
                        ${getProgressStatus(project.progress)}
                    </div>`
                }
            </div>
        </div>
    `).join('');
}

function getProgressStatus(progress) {
    if (progress < 25) return "🌱 Прорастает...";
    if (progress < 50) return "🌿 Растёт...";
    if (progress < 75) return "🌾 Созревает...";
    return "🎯 Почти готов!";
}

function renderFullNewsList() {
    const container = document.getElementById('news-full-list');
    
    container.innerHTML = news.map(item => `
        <div class="news-card">
            <div class="news-card-header">
                <h2 class="news-card-title">${item.title}</h2>
                <button class="btn-copy" onclick="shareNews(${item.id})">
                    <i class="fab fa-twitter"></i>
                </button>
            </div>
            <p class="news-card-content">${item.content}</p>
            <div class="news-card-footer">
                <span class="news-card-time">${item.time}</span>
                <button class="news-card-btn">Подробнее</button>
            </div>
        </div>
    `).join('');
}

function shareNews(newsId) {
    const newsItem = news.find(n => n.id === newsId);
    if (newsItem) {
        showNotification(`Новость "${newsItem.title}" скопирована для публикации! 📢`);
    }
}

function copyReferralLink() {
    const input = document.getElementById('referral-link');
    input.select();
    input.setSelectionRange(0, 99999);
    
    try {
        document.execCommand('copy');
        showNotification('Реферальная ссылка скопирована! 📋');
    } catch (err) {
        showNotification('Не удалось скопировать ссылку');
    }
}

function startProgressUpdater() {
    setInterval(() => {
        let updated = false;
        
        farmProjects.forEach(project => {
            if (project.progress < 100) {
                project.progress = Math.min(100, project.progress + Math.random() * 2);
                updated = true;

        }
     });

if (updated && currentPage === 'farm') {
            updateFarmStats();
            renderFarmProjects();
            saveUserProgress();
        }       
    }, 3000);
}

function showNotification(message) {
    const notificationsContainer = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    notificationsContainer.appendChild(notification);
    
    // Удаляем уведомление через 4 секунды
    setTimeout(() => {
        notification.remove();
    }, 4000);
}

function showProjectModal(project) {
    document.getElementById('modal-project-name').textContent = project.name;
    document.getElementById('modal-project-icon').textContent = project.icon;
    document.getElementById('modal-project-reward').textContent = project.reward;
    document.getElementById('modal-project-deadline').textContent = project.deadline;
    document.getElementById('modal-project-difficulty').textContent = project.difficulty;
    
    // Настройка кнопки перехода на сайт
    const linkBtn = document.getElementById('modal-project-link');
    linkBtn.onclick = () => {
        window.open('https://example.com/airdrop?ref=cryptofarm', '_blank');
    };
    
    // Настройка кнопки посадки
    const plantBtn = document.getElementById('modal-plant-btn');
    plantBtn.onclick = () => {
        confirmPlantProject(project);
    };
    
    document.getElementById('project-modal').classList.remove('hidden');
}

function closeProjectModal() {
    document.getElementById('project-modal').classList.add('hidden');
    // Сбрасываем чекбоксы
    document.querySelectorAll('#modal-checklist input[type="checkbox"]').forEach(cb => {
        cb.checked = false;
    });
}

function confirmPlantProject(project) {
    if (!farmProjects.find(fp => fp.id === project.id)) {
        const plantedProject = {
            ...project,
            planted: true,
            progress: 0,
            plantedAt: Date.now()
        };
        
        farmProjects.push(plantedProject);
        updateFarmStats();
        renderFarmProjects();
        
        showNotification(`Проект "${project.name}" успешно посажен! 🌱`);
        saveUserProgress();
        
        // Симуляция перехода по партнерской ссылке
        
        closeProjectModal();
    } else {
        showNotification('Проект уже посажен на ферме!');
    }
}

// Дополнительные функции для улучшения UX

// Обработка кликов вне области
document.addEventListener('click', function(e) {
    // Закрываем модальные окна при клике вне их области
    if (e.target.classList.contains('modal-overlay')) {
        closeModal();
    }
});

// Обработка нажатий клавиш
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

function closeModal() {
    // Закрываем все модальные окна
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
    closeProjectModal();
}

// Функция для анимации при загрузке
function animateOnLoad() {
    const cards = document.querySelectorAll('.project-card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'all 0.5s ease';
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 100);
        }, index * 100);
    });
}

// Функция для сохранения состояния в localStorage (если потребуется)
function saveState() {
    const state = {
        farmProjects: farmProjects,
        isLoggedIn: isLoggedIn,
        currentPage: currentPage
    };
    
    // В реальном приложении здесь был бы localStorage
    console.log('Состояние сохранено:', state);
}

// Функция для загрузки состояния
function loadState() {
    // В реальном приложении здесь была бы загрузка из localStorage
    console.log('Состояние загружено');
}

// Функция для проверки соединения
function checkConnection() {
    return navigator.onLine;
}

// Обработчики для офлайн/онлайн режима
window.addEventListener('online', function() {
    showNotification('Соединение восстановлено! 🌐');
});

window.addEventListener('offline', function() {
    showNotification('Нет соединения с интернетом ⚠️');
});

// Функция для дебаунса (для оптимизации производительности)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Оптимизированная функция поиска
const debouncedSearch = debounce(function(query) {
    // Логика поиска проектов
    console.log('Поиск:', query);
}, 300);

// Функция для валидации данных
function validateProject(project) {
    return project && 
           typeof project.id === 'number' && 
           typeof project.name === 'string' && 
           typeof project.type === 'string' &&
           typeof project.reward === 'string' &&
           typeof project.deadline === 'string' &&
           typeof project.difficulty === 'string' &&
           typeof project.popular === 'number';
}

// Функция для форматирования времени
function formatTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) {
        return `${minutes} мин назад`;
    } else if (hours < 24) {
        return `${hours} ч назад`;
    } else {
        return `${days} дн назад`;
    }
}

// Экспорт функций для тестирования (в реальном приложении)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        plantProject,
        harvestProject,
        showNotification,
        validateProject,
        formatTime
    };
}

// Добавить эти функции в script.js

// Редактирование проекта
// Редактирование проекта
function editProject(button) {
    const projectCard = button.closest('.project-card');
    
    // Извлекаем данные из DOM элементов
    const titleElement = projectCard.querySelector('h3');
    const imgElement = projectCard.querySelector('img');
    
    // Находим проект в массиве projects по названию
    const projectName = titleElement ? titleElement.textContent.trim() : '';
    const project = projects.find(p => p.name === projectName);
    
    currentEditingProject = projectCard;
    
    // Заполняем поля
    document.getElementById('edit-project-name').value = project ? project.name : '';
    document.getElementById('edit-project-reward').value = project ? project.reward : '';
    document.getElementById('edit-project-deadline').value = project ? project.deadline : '';
    document.getElementById('edit-project-difficulty').value = project ? project.difficulty : 'Легко';
    document.getElementById('edit-project-category').value = project ? project.type.toLowerCase() : 'defi';
    document.getElementById('edit-project-link').value = 'https://example.com'; // дефолтная ссылка
    document.getElementById('edit-project-checklist').value = 'Зарегистрироваться на сайте\nПодключить кошелёк\nВыполнить первое действие';
    
    if (imgElement) {
        document.getElementById('current-project-image').src = imgElement.src;
    }
    
    openProjectModal(projectCard);
    document.getElementById('admin-edit-section').style.display = 'block';
}

// Сохранение изменений проекта
function saveProjectChanges() {
    if (!currentEditingProject) return;
    
    const newName = document.getElementById('edit-project-name').value;
    const newReward = document.getElementById('edit-project-reward').value;
    const newCategory = document.getElementById('edit-project-category').value;
    const newDeadline = document.getElementById('edit-project-deadline').value;
    const newDifficulty = document.getElementById('edit-project-difficulty').value;
    const newLink = document.getElementById('edit-project-link').value;
    const newChecklist = document.getElementById('edit-project-checklist').value;
    
    // Обновляем название проекта
    const nameElement = currentEditingProject.querySelector('.project-name');
    if (nameElement) {
        nameElement.textContent = newName;
    }
    
    // Обновляем тип проекта
    const typeElement = currentEditingProject.querySelector('.project-type');
    if (typeElement) {
        typeElement.textContent = newCategory.toUpperCase();
    }
    
    // Обновляем данные в project-info-row элементах
    const infoRows = currentEditingProject.querySelectorAll('.project-info-row');
    infoRows.forEach(row => {
        const label = row.querySelector('.project-info-label');
        const value = row.querySelector('.project-info-value');
        
        if (label && value) {
            const labelText = label.textContent;
            if (labelText.includes('Награда')) {
                value.textContent = newReward;
            } else if (labelText.includes('Дедлайн')) {
                value.textContent = newDeadline;
            } else if (labelText.includes('Сложность')) {
                value.textContent = newDifficulty;
            }
        }
    });
    
    // Обновляем иконку, если загружено новое изображение
    if (uploadedImages['project']) {
        const iconElement = currentEditingProject.querySelector('.project-icon');
        if (iconElement) {
            // Если это img элемент
            if (iconElement.tagName === 'IMG') {
                iconElement.src = uploadedImages['project'];
            } else {
                // Если это div с эмодзи, заменяем на img
                iconElement.innerHTML = `<img src="${uploadedImages['project']}" alt="${newName}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">`;
            }
        }
        delete uploadedImages['project'];
    }
    
    // Также обновляем в массиве projects для консистентности
    const project = projects.find(p => p.name === currentEditingProject.querySelector('.project-name').textContent);
    if (project) {
        project.name = newName;
        project.type = newCategory;
        project.reward = newReward;
        project.deadline = newDeadline;
        project.difficulty = newDifficulty;
    }
    
    showNotification('Проект успешно обновлен! ✅');
    closeProjectModal();

// Сохраняем изменения в Firebase
if (project) {
    saveProjectToFirebase(project);
}
    currentEditingProject = null;
}

// Сохранение проекта в Firebase
async function saveProjectToFirebase(project) {
    try {
        await db.collection('projects').doc(project.id.toString()).set(project);
        console.log('Проект сохранен в Firebase');
    } catch (error) {
        console.error('Ошибка сохранения проекта:', error);
        showNotification('Ошибка сохранения проекта ❌');
    }
}

// Загрузка проектов из Firebase
async function loadProjectsFromFirebase() {
    try {
        const snapshot = await db.collection('projects').get();
        
        if (!snapshot.empty) {
            snapshot.forEach(doc => {
                const fbProject = doc.data();
                const index = projects.findIndex(p => p.id === fbProject.id);
                if (index !== -1) {
                    projects[index] = fbProject; // Заменяем данные из Firebase
                }
            });
            console.log('Проекты загружены из Firebase');
        }
    } catch (error) {
        console.error('Ошибка загрузки проектов:', error);
    }
}

// Удаление проекта
function deleteProject() {
    if (!currentEditingProject) return;
    
    if (confirm('Вы уверены, что хотите удалить этот проект?')) {
        currentEditingProject.remove();
        alert('Проект удален!');
        closeProjectModal();
        currentEditingProject = null;
    }
}

// Добавление нового проекта
function addNewProject() {
    const name = document.getElementById('new-project-name').value;
    const category = document.getElementById('new-project-category').value;
    const reward = document.getElementById('new-project-reward').value;
    const deadline = document.getElementById('new-project-deadline').value;
    const difficulty = document.getElementById('new-project-difficulty').value;
    const link = document.getElementById('new-project-link').value;
    const checklist = document.getElementById('new-project-checklist').value;
    
    if (!name || !reward) {
        alert('Заполните обязательные поля: название и награда');
        return;
    }
    
    // Создаем новую карточку проекта
    const projectsGrid = document.querySelector('.projects-grid');
    const newProjectCard = document.createElement('div');
    newProjectCard.className = `project-card ${category}`;
    
    const imageUrl = uploadedImages['new-project'] || 'https://via.placeholder.com/60';
    
    newProjectCard.innerHTML = `
        <div class="project-header">
            <img src="${imageUrl}" alt="${name}" class="project-icon">
            <div class="project-info">
                <h3 class="project-name">${name}</h3>
                <span class="category-tag ${category}">${category.toUpperCase()}</span>
            </div>
        </div>
        <div class="project-details">
            <div class="detail-row">
                <span class="detail-label">💰 Награда:</span>
                <span class="reward">${reward}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">⏰ Дедлайн:</span>
                <span class="deadline">${deadline}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">📊 Сложность:</span>
                <span class="difficulty">${difficulty}</span>
            </div>
        </div>
        <button class="btn-primary" onclick="openProjectModal(this.parentElement)">
            Подробнее →
        </button>
    `;
    
    // Если есть ссылка, делаем карточку кликабельной
    if (link) {
        const linkElement = document.createElement('a');
        linkElement.href = link;
        linkElement.target = '_blank';
        linkElement.style.textDecoration = 'none';
        linkElement.appendChild(newProjectCard.cloneNode(true));
        projectsGrid.appendChild(linkElement);
    } else {
        projectsGrid.appendChild(newProjectCard);
    }
    
    // Добавляем админ-кнопки к новому проекту, если пользователь админ
    if (isAdmin) {
        addAdminButtonsToProjects();
    }
    
    alert('Новый проект добавлен!');
    closeAddProjectModal();
}

// Добавление новости
function addNewNews() {
    const title = document.getElementById('new-news-title').value;
    const content = document.getElementById('new-news-content').value;
    const date = document.getElementById('new-news-date').value;
    
    if (!title || !content) {
        alert('Заполните обязательные поля: заголовок и содержание');
        return;
    }
    
    // Создаем новую карточку новости
    const newsContainer = document.querySelector('.news-grid');
    const newNewsCard = document.createElement('div');
    newNewsCard.className = 'news-card';
    
    newNewsCard.innerHTML = `
        <div class="news-header">
            <h3>${title}</h3>
            <span class="news-date">${date || 'Только что'}</span>
        </div>
        <p>${content}</p>
    `;
    
    // Вставляем в начало списка новостей
    newsContainer.insertBefore(newNewsCard, newsContainer.firstChild);
    
    // Добавляем админ-кнопки к новой новости, если пользователь админ
    if (isAdmin) {
        addAdminButtonsToNews();
    }
    
    alert('Новость добавлена!');
    closeAddNewsModal();
}

// Удаление новости
function deleteNews(button) {
    const newsCard = button.closest('.news-card');
    
    if (confirm('Вы уверены, что хотите удалить эту новость?')) {
        newsCard.remove();
        alert('Новость удалена!');
    }
}

// Функция для открытия модального окна проекта (если её нет)
function openProjectModal(projectCard) {
    const modal = document.getElementById('project-modal');
    if (modal) {
        modal.classList.remove('hidden');
        // Заполняем модальное окно данными проекта
        const projectName = projectCard.querySelector('.project-name').textContent;
        const modalTitle = modal.querySelector('.modal-header h2');
        if (modalTitle) {
            modalTitle.textContent = projectName;
        }
    }
}

// Функция для закрытия модального окна проекта (если её нет)
function closeProjectModal() {
    const modal = document.getElementById('project-modal');
    if (modal) {
        modal.classList.add('hidden');
        // Скрываем админ-секцию при закрытии
        document.getElementById('admin-edit-section').style.display = 'none';
    }
}
