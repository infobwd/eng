// sw.js - Service Worker สำหรับ Progressive Web App

const CACHE_NAME = 'vocabulary-game-v1.2.0';
const STATIC_CACHE = 'vocabulary-static-v1.2.0';
const DYNAMIC_CACHE = 'vocabulary-dynamic-v1.2.0';

// ไฟล์หลักที่ต้อง Cache
const STATIC_FILES = [
    '/',
    '/index.html',
    '/data.js', 
    '/game.js',
    '/manifest.json',
    '/offline.html'
];

// ไฟล์ภายนอกที่ต้อง Cache
const EXTERNAL_FILES = [
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap',
    'https://fonts.gstatic.com/s/sarabun/v13/DtVjJx26TKEqsc-lOOaH0Ed_DIaKSw.woff2'
];

// รายการไฟล์ทั้งหมดที่ต้อง Cache
const ALL_CACHE_FILES = [...STATIC_FILES, ...EXTERNAL_FILES];

// ติดตั้ง Service Worker และ Cache ไฟล์
self.addEventListener('install', (event) => {
    console.log('📦 Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            // Cache static files
            caches.open(STATIC_CACHE).then((cache) => {
                console.log('📁 Caching static files');
                return cache.addAll(STATIC_FILES);
            }),
            
            // Cache external files แยกต่างหาก
            caches.open(DYNAMIC_CACHE).then((cache) => {
                console.log('🌐 Caching external files');
                return Promise.allSettled(
                    EXTERNAL_FILES.map(url => 
                        fetch(url)
                            .then(response => cache.put(url, response))
                            .catch(error => console.warn(`Failed to cache ${url}:`, error))
                    )
                );
            })
        ]).then(() => {
            console.log('✅ Service Worker installation complete');
            // Force activate immediately
            return self.skipWaiting();
        }).catch((error) => {
            console.error('❌ Service Worker installation failed:', error);
        })
    );
});

// เปิดใช้งาน Service Worker
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker activating...');
    
    event.waitUntil(
        Promise.all([
            // ลบ cache เก่า
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && 
                            cacheName !== DYNAMIC_CACHE && 
                            cacheName !== CACHE_NAME) {
                            console.log('🗑️ Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            
            // Claim all clients
            self.clients.claim()
        ]).then(() => {
            console.log('✅ Service Worker activation complete');
        })
    );
});

// จัดการการดึงข้อมูล (Fetch)
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // ข้าม non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // จัดการตาม URL
    if (isStaticFile(request.url)) {
        event.respondWith(handleStaticFile(request));
    } else if (isExternalFile(request.url)) {
        event.respondWith(handleExternalFile(request));
    } else {
        event.respondWith(handleDynamicRequest(request));
    }
});

// ตรวจสอบว่าเป็นไฟล์ static หรือไม่
function isStaticFile(url) {
    return STATIC_FILES.some(file => url.includes(file) || url.endsWith(file));
}

// ตรวจสอบว่าเป็นไฟล์ภายนอกหรือไม่
function isExternalFile(url) {
    return EXTERNAL_FILES.some(file => url.includes(file));
}

// จัดการไฟล์ static (Cache First)
async function handleStaticFile(request) {
    try {
        const cacheResponse = await caches.match(request);
        if (cacheResponse) {
            return cacheResponse;
        }
        
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Static file fetch failed:', error);
        
        // ส่งหน้า offline หากเป็น HTML
        if (request.destination === 'document') {
            const offlineResponse = await caches.match('/offline.html');
            return offlineResponse || new Response('Offline', { status: 503 });
        }
        
        return new Response('Network Error', { status: 503 });
    }
}

// จัดการไฟล์ภายนอก (Stale While Revalidate)
async function handleExternalFile(request) {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        const cacheResponse = await cache.match(request);
        
        // Fetch ใหม่ในพื้นหลัง
        const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        }).catch(() => null);
        
        // ส่งคืน cache ทันที หากมี
        if (cacheResponse) {
            return cacheResponse;
        }
        
        // หากไม่มี cache รอ network response
        return await fetchPromise || new Response('Offline', { status: 503 });
    } catch (error) {
        console.error('External file fetch failed:', error);
        return new Response('Network Error', { status: 503 });
    }
}

// จัดการ request อื่นๆ (Network First)
async function handleDynamicRequest(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok && request.url.startsWith(self.location.origin)) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Dynamic request failed:', error);
        
        const cacheResponse = await caches.match(request);
        if (cacheResponse) {
            return cacheResponse;
        }
        
        // หากเป็น HTML ส่งหน้า offline
        if (request.destination === 'document') {
            const offlineResponse = await caches.match('/offline.html');
            return offlineResponse || new Response('Offline', { status: 503 });
        }
        
        return new Response('Offline', { status: 503 });
    }
}

// Push Notification (สำหรับการแจ้งเตือนในอนาคต)
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        
        const options = {
            body: data.body,
            icon: '/icon-192.png',
            badge: '/badge-72.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: data.primaryKey
            },
            actions: [
                {
                    action: 'explore',
                    title: 'เล่นเกม',
                    icon: '/icon-play.png'
                },
                {
                    action: 'close',
                    title: 'ปิด',
                    icon: '/icon-close.png'
                }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// คลิก Notification
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message handling สำหรับการอัพเดท
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Background Sync (สำหรับอนาคต)
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    try {
        // ทำงานพื้นหลัง เช่น sync ข้อมูล
        console.log('Background sync completed');
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

console.log('🚀 Service Worker loaded successfully!');