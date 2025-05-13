// Inicializar animaciones AOS cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    // Configuración de la biblioteca AOS para animaciones al hacer scroll
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true
    });

    // Inicializar todas las funciones
    crearNotas();
    crearParticulas();
    iniciarCursorBrillante();
    animarVisualizador();
    crearEspectroReproductor();
    animarContadores();
    iniciarCarruselTestimonios();
    agregarEfectosInteractivos();
    iniciarValidacionFormulario();
});

// Crear notas musicales flotantes
function crearNotas() {
    const contenedorNotas = document.querySelector('.notes-container');
    if (!contenedorNotas) return;
    
    const notas = ['♪', '♫', '𝅘𝅥𝅮', '𝅘𝅥', '𝅘𝅥𝅯', '𝅗𝅥', '𝄞'];
    const cantidadNotas = 20;
    
    // Generar cada nota con propiedades aleatorias
    for (let i = 0; i < cantidadNotas; i++) {
        const nota = document.createElement('div');
        nota.classList.add('note');
        nota.innerHTML = notas[Math.floor(Math.random() * notas.length)];
        nota.style.left = `${Math.random() * 100}%`;
        nota.style.animationDelay = `${Math.random() * 15}s`;
        nota.style.animationDuration = `${15 + Math.random() * 15}s`;
        nota.style.fontSize = `${1 + Math.random() * 1.5}rem`;
        nota.style.color = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.3})`;
        contenedorNotas.appendChild(nota);
    }
}

// Crear partículas para la sección CTA
function crearParticulas() {
    const contenedorParticulas = document.querySelector('.particles-container');
    if (!contenedorParticulas) return;
    
    const cantidadParticulas = 30;
    
    // Crear cada partícula con propiedades aleatorias
    for (let i = 0; i < cantidadParticulas; i++) {
        const particula = document.createElement('div');
        particula.classList.add('particle');
        
        // Propiedades aleatorias para cada partícula
        particula.style.left = `${Math.random() * 100}%`;
        particula.style.width = `${4 + Math.random() * 8}px`;
        particula.style.height = particula.style.width;
        particula.style.animationDelay = `${Math.random() * 20}s`;
        particula.style.animationDuration = `${10 + Math.random() * 20}s`;
        
        // Colores aleatorios para las partículas
        const colores = [
            'rgba(255, 0, 102, 0.6)',
            'rgba(255, 51, 0, 0.6)',
            'rgba(255, 153, 0, 0.6)',
            'rgba(51, 204, 51, 0.6)',
            'rgba(0, 153, 255, 0.6)',
            'rgba(102, 51, 255, 0.6)',
            'rgba(204, 0, 255, 0.6)'
        ];
        particula.style.backgroundColor = colores[Math.floor(Math.random() * colores.length)];
        
        contenedorParticulas.appendChild(particula);
    }
}

// Efecto de cursor brillante
function iniciarCursorBrillante() {
    const cursor = document.querySelector('.glowing-cursor');
    if (!cursor) return;
    
    // Seguir al cursor con el elemento brillante
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
        cursor.style.opacity = '1';
    });
    
    // Ocultar el brillo cuando el cursor sale de la página
    document.addEventListener('mouseleave', () => {
        cursor.style.opacity = '0';
    });
}

// Animación del visualizador de audio
function animarVisualizador() {
    const barras = document.querySelectorAll('.visualizer-bar');
    if (barras.length === 0) return;
    
    // Inicializar barras con alturas aleatorias
    barras.forEach(barra => {
        barra.style.height = `${20 + Math.random() * 60}px`;
    });
    
    // Animar barras continuamente
    setInterval(() => {
        barras.forEach(barra => {
            // Crear una animación más suave y consistente
            const alturaActual = parseInt(barra.style.height);
            const alturaObjetivo = 20 + Math.random() * 130;
            
            // Animar gradualmente hacia la altura objetivo
            const nuevaAltura = alturaActual + (alturaObjetivo - alturaActual) * 0.3;
            barra.style.height = `${nuevaAltura}px`;
            
            // Actualizar color de la barra basándose en el acento actual
            // Tenemos que usar colores fijos ya que no podemos acceder a las variables CSS dinámicamente
            const r = 255 - Math.floor(Math.random() * 50);
            const g = Math.floor(Math.random() * 100);
            const b = 100 + Math.floor(Math.random() * 155);
            
            barra.style.background = `linear-gradient(to top, transparent, rgba(${r}, ${g}, ${b}, 0.8))`;
            barra.style.boxShadow = `0 0 15px rgba(${r}, ${g}, ${b}, 0.5)`;
        });
    }, 300);
}

// Crear visualizador de espectro para el reproductor
function crearEspectroReproductor() {
    const espectroReproductor = document.querySelector('.player-spectrum');
    if (!espectroReproductor) return;
    
    // Crear barras para el espectro del reproductor
    for (let i = 0; i < 30; i++) {
        const barra = document.createElement('div');
        barra.classList.add('spectrum-bar');
        barra.style.width = '3px';
        barra.style.height = `${Math.random() * 100}%`;
        barra.style.background = 'var(--acento-actual)';
        barra.style.borderRadius = '1px';
        barra.style.marginRight = '2px';
        
        espectroReproductor.appendChild(barra);
    }
    
    // Animar las barras del espectro
    setInterval(() => {
        const barras = espectroReproductor.querySelectorAll('.spectrum-bar');
        barras.forEach(barra => {
            barra.style.height = `${Math.random() * 100}%`;
        });
    }, 200);
}

// Animación para los contadores de estadísticas
function animarContadores() {
    const contadores = document.querySelectorAll('[data-counter]');
    if (contadores.length === 0) return;
    
    const opciones = {
        root: null,
        threshold: 0.5,
        rootMargin: "0px"
    };
    
    // Observador de intersección para activar los contadores cuando son visibles
    const observador = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const contador = entry.target;
                const objetivo = parseFloat(contador.getAttribute('data-counter'));
                let cuenta = 0;
                const duracion = 2000; // 2 segundos
                const paso = Math.ceil(objetivo / (duracion / 16)); // 60fps
                
                // Función para actualizar el contador
                const actualizarContador = () => {
                    cuenta += paso;
                    if (cuenta >= objetivo) {
                        if (objetivo % 1 === 0) {
                            contador.textContent = objetivo + "+";
                        } else {
                            contador.textContent = objetivo;
                        }
                        return;
                    }
                    
                    if (cuenta % 1 === 0) {
                        contador.textContent = cuenta + "+";
                    } else {
                        contador.textContent = cuenta.toFixed(1);
                    }
                    requestAnimationFrame(actualizarContador);
                };
                
                actualizarContador();
                observador.unobserve(contador);
            }
        }); 
    }, opciones);
    
    // Observar todos los contadores
    contadores.forEach(contador => {
        observador.observe(contador);
    });
}

// Funcionalidad del carrusel de testimonios
function iniciarCarruselTestimonios() {
    const itemsTestimonio = document.querySelectorAll('.testimonial-item');
    const puntos = document.querySelectorAll('.testimonial-dots .dot');
    const btnPrev = document.querySelector('.arrow-prev');
    const btnNext = document.querySelector('.arrow-next');
    
    if (itemsTestimonio.length === 0) return;
    
    let indiceActual = 0;
    
    // Función para mostrar un testimonio específico
    const mostrarTestimonio = (indice) => {
        itemsTestimonio.forEach(item => item.classList.remove('active'));
        puntos.forEach(punto => punto.classList.remove('active'));
        
        itemsTestimonio[indice].classList.add('active');
        puntos[indice].classList.add('active');
        indiceActual = indice;
    };
    
    // Inicializar con el primer testimonio activo
    mostrarTestimonio(0);
    
    // Agregar listeners de click a los puntos
    puntos.forEach((punto, indice) => {
        punto.addEventListener('click', () => {
            mostrarTestimonio(indice);
        });
    });
    
    // Agregar listeners de click a los botones de navegación
    if (btnPrev && btnNext) {
        btnPrev.addEventListener('click', () => {
            let nuevoIndice = indiceActual - 1;
            if (nuevoIndice < 0) nuevoIndice = itemsTestimonio.length - 1;
            mostrarTestimonio(nuevoIndice);
        });
        
        btnNext.addEventListener('click', () => {
            let nuevoIndice = indiceActual + 1;
            if (nuevoIndice >= itemsTestimonio.length) nuevoIndice = 0;
            mostrarTestimonio(nuevoIndice);
        });
    }
    
    // Rotación automática de testimonios
    setInterval(() => {
        let nuevoIndice = indiceActual + 1;
        if (nuevoIndice >= itemsTestimonio.length) nuevoIndice = 0;
        mostrarTestimonio(nuevoIndice);
    }, 5000);
}

// Agregar efectos interactivos a botones y tarjetas
function agregarEfectosInteractivos() {
    const elementosInteractivos = document.querySelectorAll('.btn, .feature-card, .stat-card, .social-icon, .album-card');
    
    elementosInteractivos.forEach(elemento => {
        elemento.addEventListener('mouseenter', () => {
            let translateY = '-5px';
            if (elemento.classList.contains('btn')) translateY = '-3px';
            
            elemento.style.transform = `translateY(${translateY})`;
            elemento.style.boxShadow = '0 10px 20px rgba(var(--acento-actual), 0.3)';
            elemento.style.transition = 'all 0.3s ease';
        });
        
        elemento.addEventListener('mouseleave', () => {
            elemento.style.transform = 'translateY(0)';
            elemento.style.boxShadow = '';
        });
    });
    
    // Agregar efecto hover a links de navegación
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('mouseenter', () => {
            link.style.color = '#ffffff';
        });
        
        link.addEventListener('mouseleave', () => {
            if (!link.classList.contains('active')) {
                link.style.color = '';
            }
        });
    });
}

// Validación de formularios
function iniciarValidacionFormulario() {
    const formularios = document.querySelectorAll('form');
    
    formularios.forEach(formulario => {
        formulario.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const emailInput = formulario.querySelector('input[type="email"]');
            const passwordInput = formulario.querySelector('input[type="password"]');
            
            let esValido = true;
            
            if (emailInput) {
                if (emailInput.value.trim() === '') {
                    mostrarErrorFormulario(emailInput, 'Por favor, introduce tu correo electrónico');
                    esValido = false;
                } else if (!esEmailValido(emailInput.value)) {
                    mostrarErrorFormulario(emailInput, 'Por favor, introduce un correo electrónico válido');
                    esValido = false;
                }
            }
            
            if (passwordInput) {
                if (passwordInput.value.trim() === '') {
                    mostrarErrorFormulario(passwordInput, 'Por favor, introduce tu contraseña');
                    esValido = false;
                }
            }
            
            if (esValido) {
                // Simular éxito de login
                const submitBtn = formulario.querySelector('button[type="submit"]');
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Entrando...';
                
                setTimeout(() => {
                    // Simular login exitoso
                    mostrarMensajeExito('¡Inicio de sesión exitoso! Redirigiendo...');
                    
                    // Resetear formulario
                    setTimeout(() => {
                        formulario.reset();
                        submitBtn.innerHTML = 'Entrar';
                        
                        // Cerrar modal si está en modal
                        const modal = document.getElementById('loginModal');
                        if (modal) {
                            const instanciaModal = bootstrap.Modal.getInstance(modal);
                            if (instanciaModal) {
                                instanciaModal.hide();
                            }
                        }
                    }, 1500);
                }, 2000);
            }
        });
    });
}

// Funciones auxiliares para validación de formularios
function mostrarErrorFormulario(input, mensaje) {
    const grupoForm = input.parentElement;
    const elementoError = grupoForm.querySelector('.invalid-feedback') || document.createElement('div');
    
    elementoError.classList.add('invalid-feedback');
    elementoError.textContent = mensaje;
    
    input.classList.add('is-invalid');
    
    if (!grupoForm.querySelector('.invalid-feedback')) {
        grupoForm.appendChild(elementoError);
    }
    
    input.addEventListener('input', () => {
        input.classList.remove('is-invalid');
    }, { once: true });
}

function esEmailValido(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function mostrarMensajeExito(mensaje) {
    // Crear una notificación tipo toast
    const contenedorToast = document.createElement('div');
    contenedorToast.style.position = 'fixed';
    contenedorToast.style.bottom = '20px';
    contenedorToast.style.right = '20px';
    contenedorToast.style.zIndex = '9999';
    
    const toast = document.createElement('div');
    toast.style.backgroundColor = '#28a745';
    toast.style.color = 'white';
    toast.style.padding = '15px 25px';
    toast.style.borderRadius = '5px';
    toast.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '10px';
    toast.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${mensaje}</span>
    `;
    
    contenedorToast.appendChild(toast);
    document.body.appendChild(contenedorToast);
    
    // Animar el toast
    toast.style.transform = 'translateY(100px)';
    toast.style.opacity = '0';
    toast.style.transition = 'all 0.3s ease';
    
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    }, 100);
    
    // Eliminar el toast después de unos segundos
    setTimeout(() => {
        toast.style.transform = 'translateY(100px)';
        toast.style.opacity = '0';
        
        setTimeout(() => {
            document.body.removeChild(contenedorToast);
        }, 300);
    }, 3000);
}

// Toggle botón play/pause para la interfaz del reproductor
document.addEventListener('DOMContentLoaded', () => {
    const btnPlay = document.querySelector('.play-btn');
    if (btnPlay) {
        btnPlay.addEventListener('click', () => {
            const icono = btnPlay.querySelector('i');
            if (icono.classList.contains('fa-play')) {
                icono.classList.remove('fa-play');
                icono.classList.add('fa-pause');
            } else {
                icono.classList.remove('fa-pause');
                icono.classList.add('fa-play');
            }
        });
    }
    
    // Funcionalidad del carrusel de álbumes
    const controlesAlbum = document.querySelectorAll('.carousel-control');
    const itemsAlbum = document.querySelectorAll('.album-card');
    
    if (controlesAlbum.length > 0 && itemsAlbum.length > 0) {
        const btnPrev = document.querySelector('.carousel-control.prev');
        const btnNext = document.querySelector('.carousel-control.next');
        
        // Funcionalidad simple de carrusel (para demostración)
        btnPrev.addEventListener('click', () => {
            document.querySelector('.album-carousel .row').prepend(itemsAlbum[itemsAlbum.length - 1]);
        });
        
        btnNext.addEventListener('click', () => {
            document.querySelector('.album-carousel .row').appendChild(itemsAlbum[0]);
        });
    }
});

// Función para agregar animación de scroll a elementos
function agregarAnimacionScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(ancla => {
        ancla.addEventListener('click', function (e) {
            e.preventDefault();
            
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
}

// Inicializar animación de scroll después de cargar el DOM
document.addEventListener('DOMContentLoaded', agregarAnimacionScroll);

// Animación para el botón de play en el mockup del reproductor
document.addEventListener('DOMContentLoaded', () => {
    const botonesPlay = document.querySelectorAll('.btn-play');
    botonesPlay.forEach(boton => {
        boton.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Crear efecto de onda
            const onda = document.createElement('span');
            onda.classList.add('ripple');
            onda.style.position = 'absolute';
            onda.style.borderRadius = '50%';
            onda.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            onda.style.transform = 'scale(0)';
            onda.style.animation = 'onda 0.6s linear';
            onda.style.pointerEvents = 'none';
            
            boton.style.position = 'relative';
            boton.style.overflow = 'hidden';
            
            boton.appendChild(onda);
            
            const diametro = Math.max(boton.clientWidth, boton.clientHeight);
            const radio = diametro / 2;
            
            onda.style.width = onda.style.height = `${diametro}px`;
            onda.style.left = '0';
            onda.style.top = '0';
            
            setTimeout(() => {
                onda.remove();
            }, 600);
        });
    });

    // Agregar animación de efecto onda al CSS
    if (!document.getElementById('animacion-onda')) {
        const estilo = document.createElement('style');
        estilo.id = 'animacion-onda';
        estilo.textContent = `
            @keyframes onda {
                0% { transform: scale(0); opacity: 1; }
                100% { transform: scale(4); opacity: 0; }
            }
        `;
        document.head.appendChild(estilo);
    }
});

// Efectos arcoíris para elementos clave
document.addEventListener('DOMContentLoaded', () => {
    const mejorarElementos = () => {
        // Agregar borde pulsante a elementos importantes
        const elementosImportantes = document.querySelectorAll('.player-mockup, .stat-card');
        elementosImportantes.forEach(el => {
            el.style.animation = 'flujoBorde 10s infinite';
        });
        
        // Agregar efecto de brillo sutil a tarjetas
        const tarjetas = document.querySelectorAll('.feature-card, .album-card');
        tarjetas.forEach(tarjeta => {
            tarjeta.classList.add('efecto-brillo');
        });
        
        // Hacer el título del hero más dinámico
        const tituloHero = document.querySelector('.hero-title');
        if (tituloHero) {
            tituloHero.style.animation = 'brilloTexto 8s infinite, flotar 3s ease-in-out infinite';
        }
    };
    
    // Agregar estos efectos después de un pequeño retraso para asegurar que todo esté cargado
    setTimeout(mejorarElementos, 1000);


});