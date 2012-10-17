/*
  AOBench (TypeScript version)
  2012/10/12
  ported by Twitter:@shohei909
	
  aobench site: http://code.google.com/p/aobench/
  HaXe version: https://github.com/yoshihiro503/aobench_haxe	

  This code is public domain.
*/

class Vec3 {
    constructor(public x, public y, public z){}
    
    static vadd = ((a, b) => new Vec3(a.x + b.x, a.y + b.y, a.z + b.z) );

    static vsub = ((a:Vec3, b:Vec3 ) => new Vec3(a.x - b.x, a.y - b.y, a.z - b.z));
    
    static vcross = ((a:Vec3, b:Vec3) => new Vec3(a.y * b.z - a.z * b.y,
                                                    a.z * b.x - a.x * b.z,
                                                    a.x * b.y - a.y * b.x));

    static vdot = ((a:Vec3, b:Vec3) => (a.x * b.x + a.y * b.y + a.z * b.z));
   

    static vnormalize(a:Vec3){
        var len = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
        var v = new Vec3(a.x, a.y, a.z);

        if (Math.abs(len) > 1.0e-17) {
            v.x /= len;
            v.y /= len;
            v.z /= len;
        }

        return v;
    }

} // class Vec3


class Isect {
    t:number = 1000000.0;
    hit:Boolean = false;// = false;
    p:Vec3 = new Vec3(0.0, 0.0, 0.0);
    n:Vec3 = new Vec3(0.0, 0.0, 0.0);
    
} // Isect


class Ray {
    constructor(public org, public dir) {}
} // Ray

class Sphere {
    constructor(public center, public radius) {}

    intersect(ray:Ray, isect:Isect) {
        // rs = ray.org - sphere.center
        var org = ray.org;
        var dir = ray.dir;
        var center = this.center;
        var rs:Vec3  = Vec3.vsub(org, center);
        var B :number = Vec3.vdot(rs, dir);
        var C :number = Vec3.vdot(rs, rs) - (this.radius * this.radius);
        var D :number = B * B - C;

        if (D > 0.0) {
            var t = -B - Math.sqrt(D);

            if ( (t > 0.0) && (t < isect.t) ) {
                isect.t   = t;
                isect.hit = true;

                var p = new Vec3(ray.org.x + ray.dir.x * t,
                             ray.org.y + ray.dir.y * t,
                             ray.org.z + ray.dir.z * t);
                isect.p = p;

                // calculate normal.
                var n = Vec3.vsub(p, center);
                isect.n = Vec3.vnormalize(n);
            }
        }
    }
} // Sphere

class Plane {
    constructor(public p, public n) {}
    intersect (ray:Ray, isect:Isect) {
        var p = this.p;
        var n = this.n;
        var org = ray.org;
        var dir = ray.dir;
        var d  = -Vec3.vdot(p, n);
        var v =  Vec3.vdot(dir, n);
        if (Math.abs(v) < 1.0e-17) return;      // no hit
        var t = -(Vec3.vdot(org, n) + d) / v;
        if ( (t > 0.0) && (t < isect.t) ) {
            isect.hit = true;
            isect.t   = t;
            isect.n   = this.n;
            isect.p   = new Vec3(ray.org.x + t * ray.dir.x,
                                 ray.org.y + t * ray.dir.y,
                                 ray.org.z + t * ray.dir.z );
        }
    }
} // Plane


class AOBench {
    spheres:Sphere[];
    plane:Plane;
    
    constructor() {
        this.spheres = [
                   new Sphere(new Vec3(-2.0, 0.0, -3.5), 0.5),
                   new Sphere(new Vec3(-0.5, 0.0, -3.0), 0.5),
                   new Sphere(new Vec3(1.0, 0.0, -2.2), 0.5)
                   ];
        this.plane = new Plane(new Vec3(0.0, -0.5, 0.0), new Vec3(0.0, 1.0, 0.0));
    }
	
    static IMAGE_WIDTH  = 256;
    static IMAGE_HEIGHT = 256;
    static NSUBSAMPLES  = 2;
    static NAO_SAMPLES  = 8;
    static EPS          = 0.0001;
    static NPHI   = AOBench.NAO_SAMPLES;
    static NTHETA = AOBench.NAO_SAMPLES;
    static ALLRAY = AOBench.NAO_SAMPLES * AOBench.NAO_SAMPLES;
	
    clamp(f):number
    {
        var i:number = f * 255.0;
        if (i > 255.0) i = 255.0;
        if (i < 0.0)   i = 0.0;
        return Math.round(i);
    }

    orthoBasis(basis:Vec3[], n:Vec3) 
    {
        basis[2] = n;
        basis[1] = new Vec3(0.0, 0.0, 0.0);

        if ((n.x < 0.6) && (n.x > -0.6)) {
            basis[1].x = 1.0;
        } else if ((n.y < 0.6) && (n.y > -0.6)) {
            basis[1].y = 1.0;
        } else if ((n.z < 0.6) && (n.z > -0.6)) {
            basis[1].z = 1.0;
        } else {
            basis[1].x = 1.0;
        }

        var b1 = basis[1], b2 = basis[2];
        basis[0] = Vec3.vcross(b1, b2);
        basis[0] = Vec3.vnormalize(basis[0]);

        var b0 = basis[0];
        basis[1] = Vec3.vcross(b2, b0);
        basis[1] = Vec3.vnormalize(basis[1]);
    }

    
    /*init_scene():void
      {
      spheres = [
      new Sphere(new Vec3(-2.0, 0.0, -3.5), 0.5),
      new Sphere(new Vec3(-0.5, 0.0, -3.0), 0.5),
      new Sphere(new Vec3(1.0, 0.0, -2.2), 0.5)
      ];
      plane = new Plane(new Vec3(0.0, -0.5, 0.0), new Vec3(0.0, 1.0, 0.0));
    }*/

    /*
    static createArray(len:number):any[] {
        var xs:any[] = [];
        for (var i = 0; i < len; i++) {
            xs.push(null);
        }
        return xs;
    }*/

    ambient_occlusion(isect:Isect):Vec3
    {
        var basis:Vec3[] = [null,null,null];
        this.orthoBasis(basis, isect.n);
        
        var p = new Vec3(
                         isect.p.x + AOBench.EPS * isect.n.x,
                         isect.p.y + AOBench.EPS * isect.n.y,
                         isect.p.z + AOBench.EPS * isect.n.z);

        var occlusion = 0;

        for (var j = 0; j < AOBench.NPHI; j++) {
            for (var i = 0; i < AOBench.NTHETA; i++) {
                var r   = Math.random();
                var phi = 2.0 * Math.PI * Math.random();
                var x   = Math.cos(phi) * Math.sqrt(1.0 - r);
                var y   = Math.sin(phi) * Math.sqrt(1.0 - r);
                var z   = Math.sqrt(r);

                // local -> global
                var rx = x * basis[0].x + y * basis[1].x + z * basis[2].x;
                var ry = x * basis[0].y + y * basis[1].y + z * basis[2].y;
                var rz = x * basis[0].z + y * basis[1].z + z * basis[2].z;

                var raydir = new Vec3(rx, ry, rz);
                var ray    = new Ray(p, raydir);

                var occIsect = new Isect();
                this.spheres[0].intersect(ray, occIsect);
                this.spheres[1].intersect(ray, occIsect);
                this.spheres[2].intersect(ray, occIsect);
                this.plane.intersect(ray, occIsect);

                if (occIsect.hit)
                    occlusion++;
            }
        }
        
        // [0.0, 1.0]
        var occ_f = (AOBench.ALLRAY - occlusion) / AOBench.ALLRAY;

        return new Vec3(occ_f, occ_f, occ_f);
    }

	
    render(ctx, w:number, h:number)  {
        var cnt = 0;
        var half_w = w * .5;
        var half_h = h * .5;
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                cnt++;
                var px =  (x - half_w)/half_w;
                var py = -(y - half_h)/half_h;
                
                var eye = Vec3.vnormalize(new Vec3(px, py, -1.0));
                var ray = new Ray(new Vec3(0.0, 0.0, 0.0), eye);
                
                var isect = new Isect();
                this.spheres[0].intersect(ray, isect);
                this.spheres[1].intersect(ray, isect);
                this.spheres[2].intersect(ray, isect);
                this.plane.intersect(ray, isect);
                
                var col:Vec3;
                if (isect.hit) { col = this.ambient_occlusion(isect); }
                else { col = new Vec3(0.0,0.0,0.0); }

                var r = Math.round(col.x * 255.0);
                var g = Math.round(col.y * 255.0);
                var b = Math.round(col.z * 255.0);
                
                // use fill rect
                var rgb:string = ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
                ctx.fillRect (x, y, 1, 1);
            }
        }
    }

} // aobench


class Application {
    static main(canvasId:string, fpsId:string, quantity:number) {

        var dom = window.document;
        var canvas:any = dom.getElementById(canvasId);
        var ctx = canvas.getContext("2d");

        var ao = new AOBench();
        var t0 = new Date().getTime();
        ao.render(ctx,256,256);
        var t1 = new Date().getTime();
        var d = t1 - t0;
        dom.getElementById(fpsId).innerHTML = "Time = " + d + "[ms]";
        
        console.log("ok");
        
        var nullpo;
        nullpo.nullpo;
    }
}

window.addEventListener("DOMContentLoaded", function (e) {
    Application.main("night-sky", "fps", 1000);
});