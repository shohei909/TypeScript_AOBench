var Vec3 = (function () {
    function Vec3(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    Vec3.vadd = (function (a, b) {
        return new Vec3(a.x + b.x, a.y + b.y, a.z + b.z);
    });
    Vec3.vsub = (function (a, b) {
        return new Vec3(a.x - b.x, a.y - b.y, a.z - b.z);
    });
    Vec3.vcross = (function (a, b) {
        return new Vec3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
    });
    Vec3.vdot = (function (a, b) {
        return (a.x * b.x + a.y * b.y + a.z * b.z);
    });
    Vec3.vnormalize = function vnormalize(a) {
        var len = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
        var v = new Vec3(a.x, a.y, a.z);
        if(Math.abs(len) > 1e-17) {
            v.x /= len;
            v.y /= len;
            v.z /= len;
        }
        return v;
    }
    return Vec3;
})();
var Isect = (function () {
    function Isect() {
        this.t = 1000000;
        this.hit = false;
        this.p = new Vec3(0, 0, 0);
        this.n = new Vec3(0, 0, 0);
    }
    return Isect;
})();
var Ray = (function () {
    function Ray(org, dir) {
        this.org = org;
        this.dir = dir;
    }
    return Ray;
})();
var Sphere = (function () {
    function Sphere(center, radius) {
        this.center = center;
        this.radius = radius;
    }
    Sphere.prototype.intersect = function (ray, isect) {
        var org = ray.org;
        var dir = ray.dir;
        var center = this.center;
        var rs = Vec3.vsub(org, center);
        var B = Vec3.vdot(rs, dir);
        var C = Vec3.vdot(rs, rs) - (this.radius * this.radius);
        var D = B * B - C;
        if(D > 0) {
            var t = -B - Math.sqrt(D);
            if((t > 0) && (t < isect.t)) {
                isect.t = t;
                isect.hit = true;
                var p = new Vec3(ray.org.x + ray.dir.x * t, ray.org.y + ray.dir.y * t, ray.org.z + ray.dir.z * t);
                isect.p = p;
                var n = Vec3.vsub(p, center);
                isect.n = Vec3.vnormalize(n);
            }
        }
    };
    return Sphere;
})();
var Plane = (function () {
    function Plane(p, n) {
        this.p = p;
        this.n = n;
    }
    Plane.prototype.intersect = function (ray, isect) {
        var p = this.p;
        var n = this.n;
        var org = ray.org;
        var dir = ray.dir;
        var d = -Vec3.vdot(p, n);
        var v = Vec3.vdot(dir, n);
        if(Math.abs(v) < 1e-17) {
            return;
        }
        var t = -(Vec3.vdot(org, n) + d) / v;
        if((t > 0) && (t < isect.t)) {
            isect.hit = true;
            isect.t = t;
            isect.n = this.n;
            isect.p = new Vec3(ray.org.x + t * ray.dir.x, ray.org.y + t * ray.dir.y, ray.org.z + t * ray.dir.z);
        }
    };
    return Plane;
})();
var AOBench = (function () {
    function AOBench() {
        this.spheres = [
            new Sphere(new Vec3(-2, 0, -3.5), 0.5), 
            new Sphere(new Vec3(-0.5, 0, -3), 0.5), 
            new Sphere(new Vec3(1, 0, -2.2), 0.5)
        ];
        this.plane = new Plane(new Vec3(0, -0.5, 0), new Vec3(0, 1, 0));
    }
    AOBench.IMAGE_WIDTH = 256;
    AOBench.IMAGE_HEIGHT = 256;
    AOBench.NSUBSAMPLES = 2;
    AOBench.NAO_SAMPLES = 8;
    AOBench.EPS = 0.0001;
    AOBench.NPHI = AOBench.NAO_SAMPLES;
    AOBench.NTHETA = AOBench.NAO_SAMPLES;
    AOBench.ALLRAY = AOBench.NAO_SAMPLES * AOBench.NAO_SAMPLES;
    AOBench.prototype.clamp = function (f) {
        var i = f * 255;
        if(i > 255) {
            i = 255;
        }
        if(i < 0) {
            i = 0;
        }
        return Math.round(i);
    };
    AOBench.prototype.orthoBasis = function (basis, n) {
        basis[2] = n;
        basis[1] = new Vec3(0, 0, 0);
        if((n.x < 0.6) && (n.x > -0.6)) {
            basis[1].x = 1;
        } else {
            if((n.y < 0.6) && (n.y > -0.6)) {
                basis[1].y = 1;
            } else {
                if((n.z < 0.6) && (n.z > -0.6)) {
                    basis[1].z = 1;
                } else {
                    basis[1].x = 1;
                }
            }
        }
        var b1 = basis[1];
        var b2 = basis[2];

        basis[0] = Vec3.vcross(b1, b2);
        basis[0] = Vec3.vnormalize(basis[0]);
        var b0 = basis[0];
        basis[1] = Vec3.vcross(b2, b0);
        basis[1] = Vec3.vnormalize(basis[1]);
    };
    AOBench.prototype.ambient_occlusion = function (isect) {
        var basis = [
            null, 
            null, 
            null
        ];
        this.orthoBasis(basis, isect.n);
        var p = new Vec3(isect.p.x + AOBench.EPS * isect.n.x, isect.p.y + AOBench.EPS * isect.n.y, isect.p.z + AOBench.EPS * isect.n.z);
        var occlusion = 0;
        for(var j = 0; j < AOBench.NPHI; j++) {
            for(var i = 0; i < AOBench.NTHETA; i++) {
                var r = Math.random();
                var phi = 2 * Math.PI * Math.random();
                var x = Math.cos(phi) * Math.sqrt(1 - r);
                var y = Math.sin(phi) * Math.sqrt(1 - r);
                var z = Math.sqrt(r);
                var rx = x * basis[0].x + y * basis[1].x + z * basis[2].x;
                var ry = x * basis[0].y + y * basis[1].y + z * basis[2].y;
                var rz = x * basis[0].z + y * basis[1].z + z * basis[2].z;
                var raydir = new Vec3(rx, ry, rz);
                var ray = new Ray(p, raydir);
                var occIsect = new Isect();
                this.spheres[0].intersect(ray, occIsect);
                this.spheres[1].intersect(ray, occIsect);
                this.spheres[2].intersect(ray, occIsect);
                this.plane.intersect(ray, occIsect);
                if(occIsect.hit) {
                    occlusion++;
                }
            }
        }
        var occ_f = (AOBench.ALLRAY - occlusion) / AOBench.ALLRAY;
        return new Vec3(occ_f, occ_f, occ_f);
    };
    AOBench.prototype.render = function (ctx, w, h) {
        var cnt = 0;
        var half_w = w * 0.5;
        var half_h = h * 0.5;
        for(var y = 0; y < h; y++) {
            for(var x = 0; x < w; x++) {
                cnt++;
                var px = (x - half_w) / half_w;
                var py = -(y - half_h) / half_h;
                var eye = Vec3.vnormalize(new Vec3(px, py, -1));
                var ray = new Ray(new Vec3(0, 0, 0), eye);
                var isect = new Isect();
                this.spheres[0].intersect(ray, isect);
                this.spheres[1].intersect(ray, isect);
                this.spheres[2].intersect(ray, isect);
                this.plane.intersect(ray, isect);
                var col;
                if(isect.hit) {
                    col = this.ambient_occlusion(isect);
                } else {
                    col = new Vec3(0, 0, 0);
                }
                var r = Math.round(col.x * 255);
                var g = Math.round(col.y * 255);
                var b = Math.round(col.z * 255);
                var rgb = ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
                ctx.fillRect(x, y, 1, 1);
            }
        }
    };
    return AOBench;
})();
var Application = (function () {
    function Application() { }
    Application.main = function main(canvasId, fpsId, quantity) {
        var dom = window.document;
        var canvas = dom.getElementById(canvasId);
        var ctx = canvas.getContext("2d");
        var ao = new AOBench();
        var t0 = new Date().getTime();
        ao.render(ctx, 256, 256);
        var t1 = new Date().getTime();
        var d = t1 - t0;
        dom.getElementById(fpsId).innerHTML = "Time = " + d + "[ms]";
        console.log("ok");
        var nullpo;
        nullpo.nullpo;
    }
    return Application;
})();
window.addEventListener("DOMContentLoaded", function (e) {
    Application.main("night-sky", "fps", 1000);
});
//@ sourceMappingURL=aobench.js.map
