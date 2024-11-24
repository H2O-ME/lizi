// 1. 初始化基础属性
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
const width = window.innerWidth;
const height = window.innerHeight;

const config = {
    dotsNum: 80,         // 点的数量
    radius: 1,           // 圆的半径
    fillStyle: 'rgba(255,255,255,0.5)', // 点的颜色
    connection: 120,     // 连线最大距离
    followLength: 80,    // 鼠标跟随距离
    mouseConnections: 12 // 鼠标周围的连接数量
};

// 添加一个新的配置对象来存储动画相关参数
const animationConfig = {
    easing: 0.08,  // 缓动系数
    opacity: {
        min: 0.1,
        max: 0.3
    },
    mouseRadius: {
        min: 100,
        max: 200,
        current: 100
    }
};

// 2. 修改 Particle 类
class Particle {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.baseX = this.x;  // 记录原始位置
        this.baseY = this.y;
        this.size = Math.random() * 3 + 1;
        this.speedX = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
        this.follow = false;  // 添加跟随状态标记
    }

    // 3. 更新粒子位置和状态
    update(mouse) {
        // 边界检查和速度更新
        if (this.x > this.canvas.width || this.x < 0) this.speedX = -this.speedX;
        if (this.y > this.canvas.height || this.y < 0) this.speedY = -this.speedY;
        
        this.x += this.speedX;
        this.y += this.speedY;

        // 减速处理
        if (Math.abs(this.speedX) > 1) this.speedX *= 0.95;
        if (Math.abs(this.speedY) > 1) this.speedY *= 0.95;

        // 添加位置修正逻辑
        if (mouse.x && mouse.y) {
            const dx = mouse.x - this.x;
            const dy = mouse.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // 牵引区域判断
            if (distance <= config.followLength) {
                this.follow = true;
            } 
            // 修正区域判断（牵引区域外围8像素的环形区域）
            else if (this.follow && 
                    distance > config.followLength && 
                    distance <= config.followLength + 8) {
                // 计算修正比例
                const proportion = config.followLength / distance;
                
                // 修正粒子位置到牵引区域边界
                this.x = mouse.x - dx * proportion;
                this.y = mouse.y - dy * proportion;
            } 
            // 外部区域
            else {
                this.follow = false;
            }
        }

        this.draw(ctx);
    }

    // 4. 绘制粒子
    draw(ctx) {
        ctx.fillStyle = config.fillStyle;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

window.addEventListener('load', () => {
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const particleCount = 100;

    // 创建粒子
    for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle(canvas));
    }

    function connectParticles() {
        // 常规粒子连线
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < config.connection) {
                    const opacity = (1 - distance / config.connection) * 0.5;
                    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                    ctx.closePath();
                }
            }
        }

        // 添加平滑的鼠标效果
        if (mouse.x && mouse.y) {
            // 平滑过渡鼠标半径
            const targetRadius = mouse.radius ? animationConfig.mouseRadius.max : animationConfig.mouseRadius.min;
            animationConfig.mouseRadius.current += (targetRadius - animationConfig.mouseRadius.current) * animationConfig.easing;

            const nearestParticles = particles
                .map((particle, index) => {
                    const dx = mouse.x - particle.x;
                    const dy = mouse.y - particle.y;
                    return {
                        distance: Math.sqrt(dx * dx + dy * dy),
                        particle,
                        index,
                        angle: Math.atan2(dy, dx)
                    };
                })
                .sort((a, b) => a.distance - b.distance)
                .slice(0, config.mouseConnections);

            // 绘制平滑的多边形
            ctx.beginPath();
            
            // 使用二次贝塞尔曲线连接点
            nearestParticles.forEach((p, i) => {
                const nextP = nearestParticles[(i + 1) % nearestParticles.length];
                
                // 计算控制点
                const cp = {
                    x: (p.particle.x + nextP.particle.x) / 2,
                    y: (p.particle.y + nextP.particle.y) / 2
                };

                if (i === 0) {
                    ctx.moveTo(p.particle.x, p.particle.y);
                }
                
                ctx.quadraticCurveTo(cp.x, cp.y, nextP.particle.x, nextP.particle.y);

                // 添加平滑的放射状连线
                const opacity = Math.max(
                    animationConfig.opacity.min,
                    animationConfig.opacity.max * (1 - p.distance / animationConfig.mouseRadius.current)
                );
                
                ctx.beginPath();
                ctx.moveTo(mouse.x, mouse.y);
                ctx.lineTo(p.particle.x, p.particle.y);
                ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
                ctx.stroke();
            });

            // 绘制外围多边形
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.stroke();
            ctx.closePath();
        }
    }

    const mouse = {
        x: undefined,
        y: undefined,
        pressed: false
    };

    canvas.addEventListener('mousemove', (event) => {
        mouse.x = event.x;
        mouse.y = event.y;
    });

    canvas.addEventListener('mousedown', () => {
        mouse.pressed = true;
    });

    canvas.addEventListener('mouseup', () => {
        mouse.pressed = false;
    });

    canvas.addEventListener('mouseleave', () => {
        mouse.x = undefined;
        mouse.y = undefined;
    });

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(particle => {
            particle.update(mouse);
        });

        connectParticles();
        requestAnimationFrame(animate);
    }

    animate();

    // 响应窗口大小变化
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
});
