/**
 * PANEL 3i/ATLAS - APLICACIÓN PRINCIPAL (VERSIÓN PRODUCCIÓN)
 * Optimizado para CSP estricta, sin errores de consola, con fallback WebGL robusto
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURACIÓN
    // ============================================
    const CONFIG = {
        RESIZE_DEBOUNCE_MS: 250,
        UPDATE_INTERVAL_MS: 5000,
        MAX_UPDATES_VISIBLE: 15,
        OBSERVER_THRESHOLD: 0.1,
        THREE_JS_CDN: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
        THEME_STORAGE_KEY: 'theme'
    };

    // ============================================
    // MÓDULO: Gestión del Modelo 3D con Three.js
    // ============================================
    const ThreeDModule = (() => {
        let scene, camera, renderer, object3D, stars;
        let container, fallbackCanvas;
        let isInitialized = false;
        let isAnimating = false;
        let animationFrameId = null;
        let fallbackContext = null;
        let fallbackRotation = 0;

        async function loadThreeJS() {
            if (window.THREE) return true;
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = CONFIG.THREE_JS_CDN;
                script.async = true;
                script.crossOrigin = 'anonymous';
                script.onload = () => resolve(true);
                script.onerror = () => reject(new Error('Failed to load Three.js'));
                document.head.appendChild(script);
            });
        }

        /**
         * CORRECCIÓN: Geometría compatible con Three.js r128
         * Reemplaza CapsuleGeometry (no disponible) con combinación de cilindro + esferas
         */
        function createAnomalousGeometry() {
            const group = new THREE.Group();
            
            // Cuerpo central (cilindro)
            const cylinderGeometry = new THREE.CylinderGeometry(0.4, 0.4, 1.8, 32);
            const bodyMesh = new THREE.Mesh(cylinderGeometry);
            
            // Esferas en los extremos para simular cápsula
            const sphereGeometry = new THREE.SphereGeometry(0.4, 16, 16);
            const topSphere = new THREE.Mesh(sphereGeometry);
            topSphere.position.y = 0.9;
            const bottomSphere = new THREE.Mesh(sphereGeometry);
            bottomSphere.position.y = -0.9;
            
            group.add(bodyMesh);
            group.add(topSphere);
            group.add(bottomSphere);
            
            // Aplicar distorsión anómala
            const noiseFactor = 0.15;
            [bodyMesh, topSphere, bottomSphere].forEach(mesh => {
                const positionAttribute = mesh.geometry.getAttribute('position');
                const positions = positionAttribute.array;
                for (let i = 0; i < positions.length; i += 3) {
                    positions[i] += (Math.random() - 0.5) * noiseFactor;
                    positions[i+1] += (Math.random() - 0.5) * noiseFactor;
                    positions[i+2] += (Math.random() - 0.5) * noiseFactor;
                }
                positionAttribute.needsUpdate = true;
                mesh.geometry.computeVertexNormals();
            });
            
            group.rotation.x = Math.PI / 2;
            return group;
        }

        /**
         * CORRECCIÓN: Detección robusta de WebGL
         */
        function checkWebGLSupport() {
            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (!gl) return false;
                
                // Verificar que el contexto es funcional
                const supported = gl.getParameter(gl.VERSION);
                return !!supported;
            } catch (e) {
                return false;
            }
        }

        /**
         * NUEVO: Sistema de fallback Canvas 2D
         * Renderiza una representación visual alternativa sin WebGL
         */
        function initFallback() {
            fallbackCanvas = document.getElementById('3d-fallback');
            if (!fallbackCanvas) return;
            
            fallbackCanvas.classList.remove('hidden');
            fallbackCanvas.width = fallbackCanvas.offsetWidth;
            fallbackCanvas.height = fallbackCanvas.offsetHeight;
            
            fallbackContext = fallbackCanvas.getContext('2d');
            if (!fallbackContext) return;
            
            // Ocultar contenedor 3D
            if (container) container.style.display = 'none';
            
            // Iniciar animación 2D
            animateFallback();
        }

        function animateFallback() {
            if (!fallbackContext || !fallbackCanvas) return;
            
            const ctx = fallbackContext;
            const w = fallbackCanvas.width;
            const h = fallbackCanvas.height;
            const centerX = w / 2;
            const centerY = h / 2;
            
            // Limpiar canvas
            ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-color') || '#f4f4f5';
            ctx.fillRect(0, 0, w, h);
            
            // Campo de estrellas
            ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 100; i++) {
                const x = (Math.sin(i * 0.5 + fallbackRotation * 0.1) * w/2 + centerX) % w;
                const y = (Math.cos(i * 0.3 + fallbackRotation * 0.1) * h/2 + centerY) % h;
                ctx.fillRect(x, y, 1, 1);
            }
            
            // Objeto central (elipse rotante)
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(fallbackRotation);
            
            // Sombra
            ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
            ctx.shadowBlur = 20;
            
            // Gradiente metálico
            const gradient = ctx.createLinearGradient(-80, -150, 80, 150);
            gradient.addColorStop(0, '#e0e0e0');
            gradient.addColorStop(0.5, '#ffffff');
            gradient.addColorStop(1, '#b0b0b0');
            
            ctx.fillStyle = gradient;
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            
            // Forma elongada (simulando el objeto)
            ctx.beginPath();
            ctx.ellipse(0, 0, 40, 120, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Detalles superficiales
            ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
            for (let i = 0; i < 5; i++) {
                const offset = (i - 2) * 30;
                ctx.beginPath();
                ctx.ellipse(offset * 0.3, offset, 30, 15, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
            
            // Texto informativo
            ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#ffffff' : '#000000';
            ctx.font = '14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Representación visual alternativa de 3i/Atlas', centerX, h - 20);
            ctx.font = '12px Inter, sans-serif';
            ctx.fillStyle = '#3b82f6';
            ctx.fillText('(WebGL no disponible - Modo 2D)', centerX, h - 5);
            
            fallbackRotation += 0.01;
            requestAnimationFrame(animateFallback);
        }

        function init() {
            if (isInitialized) return;
            
            try {
                container = document.getElementById('3d-container');
                fallbackCanvas = document.getElementById('3d-fallback');
                
                // Verificar soporte WebGL PRIMERO
                if (!checkWebGLSupport()) {
                    console.info('WebGL no disponible. Activando fallback Canvas 2D.');
                    initFallback();
                    return;
                }
                
                if (!container || !window.THREE) {
                    throw new Error('Contenedor 3D o librería THREE.js no encontrados.');
                }

                scene = new THREE.Scene();
                camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
                camera.position.z = 3;

                renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: false,
                    powerPreference: 'high-performance'
                });
                renderer.setClearColor(0x000000, 1);
                renderer.setSize(container.clientWidth, container.clientHeight);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                container.appendChild(renderer.domElement);

                // Crear geometría corregida
                object3D = createAnomalousGeometry();
                const material = new THREE.MeshStandardMaterial({
                    color: 0xcccccc,
                    metalness: 0.9,
                    roughness: 0.2,
                });
                object3D.traverse(child => {
                    if (child instanceof THREE.Mesh) {
                        child.material = material;
                    }
                });
                scene.add(object3D);

                const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
                scene.add(ambientLight);
                const pointLight = new THREE.PointLight(0xffffff, 1, 100);
                pointLight.position.set(5, 5, 5);
                scene.add(pointLight);

                createStarField();
                setupInteractionControls();
                
                isInitialized = true;
                startAnimation();
                
                console.info('✅ Modelo 3D inicializado correctamente (WebGL).');
            } catch (error) {
                console.error('Error al inicializar Three.js:', error);
                initFallback();
            }
        }

        function setupInteractionControls() {
            let isDragging = false;
            let previousMousePosition = { x: 0, y: 0 };
            
            const onPointerDown = (e) => {
                isDragging = true;
                previousMousePosition = getPointerPosition(e);
            };
            
            const onPointerUp = () => isDragging = false;
            
            const onPointerMove = (e) => {
                if (!isDragging || !object3D) return;
                const currentPosition = getPointerPosition(e);
                const deltaMove = {
                    x: currentPosition.x - previousMousePosition.x,
                    y: currentPosition.y - previousMousePosition.y
                };
                object3D.rotation.y += deltaMove.x * 0.01;
                object3D.rotation.x += deltaMove.y * 0.01;
                previousMousePosition = currentPosition;
            };
            
            const getPointerPosition = (e) => {
                const touch = e.touches ? e.touches[0] : e;
                return { x: touch.clientX, y: touch.clientY };
            };
            
            container.addEventListener('mousedown', onPointerDown);
            container.addEventListener('touchstart', onPointerDown, { passive: true });
            document.addEventListener('mouseup', onPointerUp);
            document.addEventListener('touchend', onPointerUp);
            container.addEventListener('mousemove', onPointerMove);
            container.addEventListener('touchmove', onPointerMove, { passive: true });
            container.addEventListener('mouseleave', onPointerUp);
        }

        function createStarField() {
            const starVertices = [];
            for (let i = 0; i < 5000; i++) {
                // CORRECCIÓN: THREE.Math en lugar de THREE.MathUtils (r128)
                const x = THREE.Math.randFloatSpread(200);
                const y = THREE.Math.randFloatSpread(200);
                const z = THREE.Math.randFloatSpread(200);
                starVertices.push(x, y, z);
            }
            
            const starGeometry = new THREE.BufferGeometry();
            starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
            const starMaterial = new THREE.PointsMaterial({
                color: 0xffffff,
                size: 0.1,
                sizeAttenuation: true
            });
            stars = new THREE.Points(starGeometry, starMaterial);
            scene.add(stars);
        }

        function animate() {
            if (!isAnimating || !renderer) return;
            animationFrameId = requestAnimationFrame(animate);
            if (document.hidden) return;

            if (object3D) {
                object3D.rotation.x += 0.001;
                object3D.rotation.y += 0.002;
            }
            if (stars) {
                stars.rotation.y += 0.0001;
            }
            renderer.render(scene, camera);
        }

        function startAnimation() {
            if (!isAnimating && isInitialized && renderer) {
                isAnimating = true;
                animate();
            }
        }

        function pauseAnimation() {
            isAnimating = false;
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        }

        function handleResize() {
            if (!isInitialized || !renderer || !camera || !container) return;
            const width = container.clientWidth;
            const height = container.clientHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
        }

        function dispose() {
            pauseAnimation();
            if (object3D) {
                object3D.traverse(child => {
                    if (child instanceof THREE.Mesh) {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) child.material.dispose();
                    }
                });
                scene.remove(object3D);
            }
            if (stars) {
                if (stars.geometry) stars.geometry.dispose();
                if (stars.material) stars.material.dispose();
                scene.remove(stars);
            }
            if (renderer) {
                renderer.dispose();
                renderer.forceContextLoss();
                if (renderer.domElement && container) {
                    try {
                        container.removeChild(renderer.domElement);
                    } catch (e) {
                        // Ignorar si el DOM ya no está
                    }
                }
            }
            isInitialized = false;
        }

        return { loadThreeJS, init, startAnimation, pauseAnimation, handleResize, dispose };
    })();

    // ============================================
    // MÓDULO: Sistema de Temas (Dark Mode)
    // ============================================
    const ThemeModule = (() => {
        const toggleButton = document.getElementById('dark-mode-toggle');
        const sunIcon = document.getElementById('sun-icon');
        const moonIcon = document.getElementById('moon-icon');

        function applyTheme(theme) {
            const isDark = theme === 'dark';
            document.documentElement.classList.toggle('dark', isDark);
            if (sunIcon && moonIcon) {
                sunIcon.style.display = isDark ? 'none' : 'block';
                moonIcon.style.display = isDark ? 'block' : 'none';
            }
            if (toggleButton) {
                toggleButton.setAttribute('aria-pressed', isDark ? 'true' : 'false');
            }
            try {
                localStorage.setItem(CONFIG.THEME_STORAGE_KEY, theme);
            } catch (e) {
                console.warn('No se pudo guardar la preferencia de tema:', e);
            }
        }

        function getSavedTheme() {
            try {
                const saved = localStorage.getItem(CONFIG.THEME_STORAGE_KEY);
                if (saved) return saved;
            } catch (e) { /* Ignorar */ }
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        function toggleTheme() {
            const newTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
            applyTheme(newTheme);
        }

        function init() {
            applyTheme(getSavedTheme());
            if (toggleButton) {
                toggleButton.addEventListener('click', toggleTheme);
            }
        }
        
        return { init };
    })();

    // ============================================
    // MÓDULO: Animaciones de Scroll
    // ============================================
    const ScrollAnimationModule = (() => {
        let observer = null;
        
        function init() {
            const sections = document.querySelectorAll('.fade-in-section');
            if (!sections.length || !('IntersectionObserver' in window)) return;
            
            observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, { threshold: CONFIG.OBSERVER_THRESHOLD });
            
            sections.forEach(section => observer.observe(section));
        }
        
        function destroy() {
            if (observer) observer.disconnect();
        }
        
        return { init, destroy };
    })();

    // ============================================
    // MÓDULO: Lazy Loading del Modelo 3D
    // ============================================
    const LazyLoadModule = (() => {
        let observer = null;
        let isLoaded = false;
        
        function init() {
            const target = document.querySelector('[data-3d-target]');
            if (!target) return;

            if (!('IntersectionObserver' in window)) {
                (async () => {
                    try {
                        await ThreeDModule.loadThreeJS();
                        ThreeDModule.init();
                    } catch (e) {
                        console.error('Error cargando Three.js:', e);
                    }
                })();
                return;
            }
            
            observer = new IntersectionObserver(async (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting && !isLoaded) {
                        isLoaded = true;
                        observer.disconnect();
                        try {
                            await ThreeDModule.loadThreeJS();
                            ThreeDModule.init();
                        } catch (error) {
                            console.error('Error cargando modelo 3D:', error);
                        }
                    }
                }
            }, { rootMargin: '100px' });
            
            observer.observe(target);
        }
        
        return { init };
    })();

    // ============================================
    // MÓDULO: Feed de Datos en Vivo
    // ============================================
    const UpdatesModule = (() => {
        const feedContainer = document.getElementById('live-data-feed');
        const mockUpdates = [
            { type: "ALERTA-KEK", msg: "Variación de brillo (0.15mag) detectada. (ID: K-881)", color: "text-red-400" },
            { type: "DATO-ESA", msg: "Confirmación de trayectoria. Excentricidad: 3.102. (ID: E-102)", color: "text-blue-300" },
            { type: "ANALISIS-G", msg: "Polarimetría sugiere superficie metálica irregular. (ID: G-042)", color: "text-yellow-300" },
            { type: "PAPER-ARXIV", msg: "Publicado estudio sobre desgasificación de sodio. (ID: 2503.112)", color: "text-green-400" }
        ];
        let updateIndex = 0;
        let intervalId = null;

        function addUpdate(update) {
            if (!feedContainer) return;
            const div = document.createElement('div');
            const typeSpan = document.createElement('span');
            typeSpan.className = `font-semibold ${update.color} mr-2`;
            typeSpan.textContent = `[${update.type}]`;
            div.appendChild(typeSpan);
            div.appendChild(document.createTextNode(` ${update.msg}`));
            feedContainer.prepend(div);
            
            while (feedContainer.children.length > CONFIG.MAX_UPDATES_VISIBLE) {
                feedContainer.removeChild(feedContainer.lastChild);
            }
        }

        function addCustomUpdate(update) {
            addUpdate(update);
        }

        function start() {
            if (intervalId) return;
            intervalId = setInterval(() => {
                addUpdate(mockUpdates[updateIndex]);
                updateIndex = (updateIndex + 1) % mockUpdates.length;
            }, CONFIG.UPDATE_INTERVAL_MS);
        }

        function stop() {
            if (intervalId) clearInterval(intervalId);
            intervalId = null;
        }

        return { start, stop, addCustomUpdate };
    })();

    // ============================================
    // MÓDULO: Modales de Alerta
    // ============================================
    const AppModals = (() => {
        const modal = document.getElementById('alert-modal');
        const modalContent = document.getElementById('modal-content');
        const modalMessage = document.getElementById('modal-message');
        const closeBtn = document.getElementById('modal-close-btn');

        function show(message) {
            if (!modal) return;
            modalMessage.textContent = message;
            modal.classList.remove('hidden');
            setTimeout(() => {
                modalContent.classList.add('opacity-100', 'scale-100');
                modalContent.classList.remove('opacity-0', 'scale-95');
            }, 10);
        }

        function hide() {
            if (!modal) return;
            modalContent.classList.remove('opacity-100', 'scale-100');
            modalContent.classList.add('opacity-0', 'scale-95');
            setTimeout(() => modal.classList.add('hidden'), 300);
        }

        function init() {
            if (closeBtn) closeBtn.addEventListener('click', hide);
            if (modal) modal.addEventListener('click', (e) => {
                if (e.target === modal) hide();
            });
        }
        
        return { showAlert: show, init };
    })();

    // ============================================
    // MÓDULO: Utilidades
    // ============================================
    const Utils = (() => {
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
        
        function smoothScrollTo(targetId) {
            const element = document.getElementById(targetId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
        
        return { debounce, smoothScrollTo };
    })();

    // ============================================
    // MÓDULO: Observador de Visibilidad 3D
    // ============================================
    const VisibilityObserverModule = (() => {
        let observer = null;
        
        function init() {
            const container = document.getElementById('3d-container');
            if (!container || !('IntersectionObserver' in window)) return;
            
            observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        ThreeDModule.startAnimation();
                    } else {
                        ThreeDModule.pauseAnimation();
                    }
                });
            }, { threshold: 0.1 });
            
            observer.observe(container);
        }
        
        return { init };
    })();

    // ============================================
    // INICIALIZACIÓN PRINCIPAL
    // ============================================
    function initializeApp() {
        ThemeModule.init();
        ScrollAnimationModule.init();
        LazyLoadModule.init();
        VisibilityObserverModule.init();
        UpdatesModule.start();
        AppModals.init();

        // Handler de Resize con Debouncing
        const debouncedResize = Utils.debounce(ThreeDModule.handleResize, CONFIG.RESIZE_DEBOUNCE_MS);
        window.addEventListener('resize', debouncedResize);

        // Botón "Explorar"
        const exploreBtn = document.getElementById('explore-btn');
        if (exploreBtn) {
            exploreBtn.addEventListener('click', (e) => {
                e.preventDefault();
                Utils.smoothScrollTo('dashboard');
            });
        }
        
        // Botón "Logout"
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                AppModals.showAlert("Has cerrado la sesión. Serías redirigido a la página de login.");
            });
        }

        // Formulario de Envío de Datos
        const submissionForm = document.getElementById('data-submission-form');
        const formResponse = document.getElementById('form-response');

        if (submissionForm && formResponse) {
            submissionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(submissionForm);
                const observatory = formData.get('observatory');
                const value = formData.get('data-value');
                const type = formData.get('data-type');

                if (!observatory || !value) {
                    formResponse.textContent = "Error: Observatorio y Valor son requeridos.";
                    formResponse.className = "mt-4 p-4 rounded-md text-center bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 block";
                    return;
                }
                
                formResponse.textContent = `Éxito: Datos de '${observatory}' recibidos. Procesando...`;
                formResponse.className = "mt-4 p-4 rounded-md text-center bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 block";
                
                UpdatesModule.addCustomUpdate({
                    type: `DATO-${observatory.substring(0, 4).toUpperCase()}`,
                    msg: `[${type}] reporta: ${value}`,
                    color: "text-cyan-300"
                });

                submissionForm.reset();
                setTimeout(() => {
                    formResponse.className = "mt-4 p-4 rounded-md text-center hidden";
                }, 4000);
            });
        }

        // Carga diferida del iFrame
        window.addEventListener('load', () => {
            const videoFrame = document.getElementById('youtube-hero-video');
            if (videoFrame && videoFrame.dataset.src) {
                videoFrame.src = videoFrame.dataset.src;
            }
        });

        // Limpieza de recursos al salir
        window.addEventListener('beforeunload', () => {
            UpdatesModule.stop();
            ScrollAnimationModule.destroy();
            ThreeDModule.dispose();
        });

        console.info('✅ Panel de Análisis 3i/Atlas inicializado correctamente.');
    }

    // ============================================
    // EJECUCIÓN
    // ============================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        initializeApp();
    }

})();
