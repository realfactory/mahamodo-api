const parameter = require('./parameter.js');

function astroFcCalenAsHourDec1(hour, min) {
    let tm = parseInt(hour, 10) + parseInt(min, 10) / 60;
    let i = parameter.SaveTimeYN === "Y" ? (parameter.East_West === "E" ? 1 : -1) : 0;
    return tm + i;
}

function astroFcCalenAsTimeAdj(SaveTimeYN, East_West) {
    return SaveTimeYN === "Y" ? (East_West === "E" ? 1 : -1) : 0;
}

function astroSubCalenAsHourDec() {
    let tm = parameter.TimeZoneH + parameter.TimeZoneM / 60;
    let i = parameter.SaveTimeYN === "Y" ? (parameter.East_West === "E" ? 1 : -1) : 0;
    return tm + i;
}

function astroFcCalenAsUniversalTime1(East_West, Realtime1, c12) {
    if (East_West === "E") {
        return Realtime1 - c12 / 24 < 0 ? 1 + Realtime1 - c12 / 24 : Realtime1 - c12 / 24;
    } else {
        return Realtime1 + c12 / 24 > 1 ? Realtime1 + c12 / 24 - 1 : Realtime1 + c12 / 24;
    }
}

function astroFcCalenAsDayAdj1(C2, C47, C45) {
    if (Math.abs(C47 - C45) < 0.5) {
        return C2;
    } else {
        return C47 > C45 ? C2 - 1 : C47 < C45 ? C2 + 1 : C2;
    }
}

function jday(year, month, day, hour, min, sec, greg = true) {
    if (month <= 2) {
        month += 12;
        year -= 1;
    }

    let a = 365.0 * year - 730548.5;
    let b = greg ? Math.floor(year / 400) - Math.floor(year / 100) + Math.floor(year / 4) : -2 + Math.floor((year + 4716) / 4) - 1179;
    let jd = a + b + Math.floor(30.6001 * (month + 1)) + day + (hour + min / 60 + sec / 3600) / 24;

    return jd;
}

function thaiSuriya(day, month, year, hour, min, ZHour, ZMin, DST, LonDeg, Lonmin, East, LatDeg, Latmin, North, Index = 1) {

    // hr = hour_Renamed + min / 60
    let hr = hour + min / 60;
    let tz = ZHour + ZMin / 60;
    let ln = LonDeg + Lonmin / 60;
    let la = LatDeg + Latmin / 60;

    if (East === "E") ln = -ln;
    if (North === "S") la = -la;
    if (DST === "Y") tz += (ln < 0 ? 1 : -1);

    let jd = mdy2julian(day, month, year);
    let f = ln < 0 ? hr - tz : hr + tz;
    let t = ((jd - 2415020) + f / 24 - 0.5) / 36525;

    let ra = (6.6460656 + 2400.0513 * t + 0.0000258 * t ** 2 + f) * 15 - ln;
    ra = ra - 360 * Math.floor(ra / 360);
    let ob = 23.452294 - 0.0130125 * t;

    let mc = degAtan2(Math.tan(ra * Math.PI / 180), Math.cos(ob * Math.PI / 180));
    let ascendant = degAtan2(Math.cos(ra * Math.PI / 180), -Math.sin(ra * Math.PI / 180) * Math.cos(ob * Math.PI / 180) - Math.tan(la * Math.PI / 180) * Math.sin(ob * Math.PI / 180));
    ascendant = ascendant - 360 * Math.floor(ascendant / 360);

    const values = {
        1: ascendant,
        2: mc,
        3: ob,
        4: ra,
        5: t,
        6: jd
    };
    return values[Index] || ascendant;
}

function degAtan2(y, x) {
    const pi = Math.PI;
    return Math.atan2(y, x) * 180 / pi;
}

function mdy2julian(d, m, y) {
    let im = (12 * y) + m + 57597;
    let j = (2 * (im - Math.floor(im / 12) * 12) + 7 + 365 * im) / 12;
    j = Math.floor(j) + d + Math.floor(im / 48) - 32083;

    if (j > 2299171) {
        j = j + Math.floor(im / 4800) - Math.floor(im / 1200) + 38;
    }

    return j;
}

function ayanamsa(t, adj) {
    const pi = Math.PI;
    let ln = ((933060 - 6962911 * t + 7.5 * t ** 2) / 3600);
    ln = ln - 360 * Math.floor(ln / 360);

    let Off = (259205536 * t + 2013816) / 3600; // Mean Sun
    Off = 17.23 * Math.sin(ln * pi / 180) + 1.27 * Math.sin(Off * pi / 180) - (5025.64 + 1.11 * t) * t;

    return (Off - adj) / 3600; // Adjustments for Fagan-Bradley or Lahiri can be passed in 'adj'
}

// function day2000(year, month, day, hour, min, sec, greg = null) {
//     let a, b, sum;

//     if (month <= 2) {
//         month += 12;
//         year -= 1;
//     }

//     if (greg === 1) {
//         a = 10000.0 * year + 100.0 * month + day;
//     }

//     if (greg === 0) {
//         b = -2 + Math.trunc((year + 4716) / 4) - 1179;
//     } else {
//         b = Math.floor(year / 400) - Math.floor(year / 100) + Math.floor(year / 4);
//     }

//     a = 365.0 * year - 730548.5;

//     return sum = (a + b + Math.floor(30.6001 * (month + 1)) + day) + (hour + min / 60 + sec / 3600) / 24;
// }

function day2000(year, month, day, hour, min, sec, greg = 1) {
    let a;
    let b;

    if (month <= 2) {
        month += 12;
        year -= 1;
    }

    // Gregorian calendar correction
    if (greg === 0) {
        b = -2 + Math.floor((year + 4716) / 4) - 1179;
    } else {
        // The Gregorian correction
        b = Math.floor(year / 400) - Math.floor(year / 100) + Math.floor(year / 4);
    }

    a = 365.0 * year - 730548.5;

    return a + b + Math.floor(30.6001 * (month + 1)) + day + (hour + min / 60 + sec / 3600) / 24;
}

function secliptic(r, theta, phi, d, index) {

    let x = rectangular(r, theta, phi, 1);
    let y = rectangular(r, theta, phi, 2);
    let z = rectangular(r, theta, phi, 3);

    return spherical(recliptic(x, y, z, d, 1), recliptic(x, y, z, d, 2), recliptic(x, y, z, d, 3), index);
}

function moon(d, index) {
    if (index === 4) {
        return smoon(d, 2);
    } else {
        //smoon(d, 1) //56.456 // 56.456
        //smoon(d, 2) //0.12137340487755846 // 0.121373404877558
        //smoon(d, 3) //107.5154649506378   // 107.51546
        //d  // -3068.3708333333334 // -3068.370833333333
        // index = 2 // 2
        return sequatorial(smoon(d, 1), smoon(d, 2), smoon(d, 3), d, index);
    }
}

function smoon(d, index) {

    const rads = parameter.rads;
    const degs = parameter.degs;

    d += 1.5;

    let Nm = range360(125.1228 - 0.0529538083 * d) * rads; //5.0182629965536 //5.018262996553597
    let im = 5.1454 * rads; //0.08980417133211625 //0.089804171332116233
    let wm = range360(318.0634 + 0.1643573223 * d) * rads; //3.036885499631509
    let am = 60.2666; // Earth radii
    let ecm = 0.0549;
    let Mm = range360(115.3654 + 13.0649929509 * d) * rads;
    let ws = range360(282.9404 + 0.0000470935 * d) * rads; // Mean Longitude of the Sun
    let Ms = range360(356.0470 + 0.9856002585 * d) * rads; // Mean anomaly of the Sun
    let lm = Mm + wm + Nm; // Mean longitude of the Moon
    let ls = Ms + ws; // Mean longitude of the Sun
    let dm = lm - ls;
    let f = lm - Nm;

    let em = Mm + ecm * Math.sin(Mm) * (1 + ecm * Math.cos(Mm));
    let xv = am * (Math.cos(em) - ecm);
    let yv = am * Math.sqrt(1 - ecm * ecm) * Math.sin(em);
    let vm = Math.atan2(yv, xv);
    let rm = Math.sqrt(xv * xv + yv * yv);

    let x = rm * (Math.cos(Nm) * Math.cos(vm + wm) - Math.sin(Nm) * Math.sin(vm + wm) * Math.cos(im));
    let y = rm * (Math.sin(Nm) * Math.cos(vm + wm) + Math.cos(Nm) * Math.sin(vm + wm) * Math.cos(im));
    let z = rm * Math.sin(vm + wm) * Math.sin(im);
    let lon = Math.atan2(y, x);

    if (lon < 0) lon += 2 * Math.PI;

    let lat = Math.atan2(z, Math.sqrt(x * x + y * y));

    switch (index) {
        case 1:
            rm = (rm - 0.58 * Math.cos(Mm - 2 * dm)) - 0.46 * Math.cos(2 * dm)
            return rm;
        case 2:
            let dlat;
            dlat = -0.173 * Math.sin(f - 2 * dm)
            dlat = dlat - 0.055 * Math.sin(Mm - f - 2 * dm)
            dlat = dlat - 0.046 * Math.sin(Mm + f - 2 * dm)
            dlat = dlat + 0.033 * Math.sin(f + 2 * dm)
            dlat = dlat + 0.017 * Math.sin(2 * Mm + f)
            return lat * degs + dlat
        case 3:
            let dlon, dlonsum;
            dlon = -1.274 * Math.sin(Mm - 2 * dm)
            dlon = dlon + 0.658 * Math.sin(2 * dm)
            dlon = dlon - 0.186 * Math.sin(Ms)
            dlon = dlon - 0.059 * Math.sin(2 * Mm - 2 * dm)
            dlon = dlon - 0.057 * Math.sin(Mm - 2 * dm + Ms)
            dlon = dlon + 0.053 * Math.sin(Mm + 2 * dm)
            dlon = dlon + 0.046 * Math.sin(2 * dm - Ms)
            dlon = dlon + 0.041 * Math.sin(Mm - Ms)
            dlon = dlon - 0.035 * Math.sin(dm)
            dlon = dlon - 0.031 * Math.sin(Mm + Ms)
            dlon = dlon - 0.015 * Math.sin(2 * f - 2 * dm)
            dlon = dlon + 0.011 * Math.sin(Mm - 4 * dm)
            return lon * degs + dlon
        default:
            console.warn('Invalid index for smoon function.');
            return null;
    }
}

function sun(d, index) {
    return sequatorial(ssun(d, 1), ssun(d, 2), ssun(d, 3), d, index);
}

function ssun(d, index) {
    let G = range360(357.528 + 0.9856003 * d);
    let L = range360(280.461 + 0.9856474 * d);
    let lambda;

    switch (index) {
        case 1:
            return 1.00014 - 0.01671 * degCos(G) - 0.00014 * degCos(2 * G);
        case 2:
            return 0; // Ecliptic latitude of the Sun is always zero
        case 3:
            return range360(L + 1.915 * degSin(G) + 0.02 * degSin(2 * G));
        case 4: // Equation of time
            lambda = range360(L + 1.915 * degSin(G) + 0.02 * degSin(2 * G));
            let eot = -1.915 * degSin(G) - 0.02 * degSin(2 * G) + 2.466 * degSin(2 * lambda) - 0.053 * degSin(4 * lambda);
            return range360(eot);
        default:
            return null; // In case the index is out of bounds
    }
}

function planet(d, pnumber, index) {

    let ecl, ci, so, s1, ye, r, E, p, i, v, y, x, z, m, o, a, L, xe, ze, si, c1, co;

    // Assuming element function fills the referenced variables by their values
    ({
        i,
        o,
        p,
        a,
        E,
        L
    } = element(d, pnumber));

    m = range2pi(L - p);
    v = kepler(m, E, 8);
    r = a * (1 - E * E) / (1 + E * Math.cos(v));

    s1 = Math.sin(v + p - o);
    si = Math.sin(i);
    so = Math.sin(o);
    c1 = Math.cos(v + p - o);
    ci = Math.cos(i);
    co = Math.cos(o);

    x = r * (co * c1 - so * s1 * ci);
    y = r * (so * c1 + co * s1 * ci);
    z = r * (s1 * si);

    // {
    //     m: 3.691741748907515, 3.691
    //     v: 3.6030428802595353, 3.60304
    //     r: 1.6482479182127516, 1.64824791
    //     s1: 0.7332408403481149, 0.73324084
    //     si: 0.032303989981247026, 0.03230398 
    //     so: 0.7615648508763572, 0.761564850
    //     c1: -0.6799690213867028, -0.679969021
    //     ci: 0.9994780899205803, 0.999478
    //     co: 0.6480887114505791, 0.648088711
    //     x: -1.6462687978593378,  1.6462687
    //     y: -0.07068249011479438, -0.07068
    //     z: 0.03904139698593445 0.039041
    //   }

    // Reusing element values for second computation
    ({
        i,
        o,
        p,
        a,
        E,
        L
    } = element(d, 3));

    m = range2pi(L - p);
    v = kepler(m, E, 8);
    r = a * (1 - E * E) / (1 + E * Math.cos(v));
    s1 = Math.sin(v + p - o);
    si = Math.sin(i);
    so = Math.sin(o);
    c1 = Math.cos(v + p - o);
    ci = Math.cos(i);
    co = Math.cos(o);
    xe = r * (co * c1 - so * s1 * ci);
    ye = r * (so * c1 + co * s1 * ci);
    ze = r * (s1 * si);
    x = x - xe;
    y = y - ye;

    // ecliptic angle for J2000.0
    ecl = 23.429292 * parameter.rads; // 23.439292 เอไอแปลได้

    xe = x;
    ye = y * Math.cos(ecl) - z * Math.sin(ecl);
    ze = y * Math.sin(ecl) + z * Math.cos(ecl);

    switch (index) {
        case 3:
            // y- 2.3660050184248833 //-2.36600501842484
            // x 0.5750585433546084 // 0.575058543354706
            //atan2 2.9031653789454626 // 2.90316537894542
            let planet = atan2(ye, xe) * parameter.degs
            return planet < 0 ? 360 + planet : planet;
        case 2:
            return Math.atan(ze / Math.sqrt(xe * xe + ye * ye)) * parameter.degs
        case 1:
            return Math.sqrt(xe * xe + ye * ye + ze * ze);
        default:
            return null; // Handle unexpected index values
    }
}

function element(d, pnum) {
    let i, o, p, a, E, L;

    switch (pnum) {
        case 1: // mercury
            i = rads(7.00487 - 0.000000178797 * d);
            o = rads(48.33167 - 0.0000033942 * d);
            p = rads(77.45645 + 0.00000436208 * d);
            a = 0.38709893 + 0.0000000000180698 * d;
            E = 0.20563069 + 0.000000000691855 * d;
            L = range2pi(rads(252.25084 + 4.092338796 * d));
            break;
        case 2: // venus
            i = rads(3.39471 - 0.0000000217507 * d);
            o = rads(76.68069 - 0.0000075815 * d);
            p = rads(131.53298 - 0.000000827439 * d);
            a = 0.72333199 + 0.0000000000251882 * d;
            E = 0.00677323 - 0.00000000135195 * d;
            L = range2pi(rads(181.97973 + 1.602130474 * d));
            break;
        case 3: // earth
            i = rads(0.00005 - 0.000000356985 * d);
            o = rads(-11.26064 - 0.00013863 * d);
            p = rads(102.94719 + 0.00000911309 * d);
            a = 1.00000011 - 0.00000000000136893 * d;
            E = 0.01671022 - 0.00000000104148 * d;
            L = range2pi(rads(100.46435 + 0.985609101 * d));
            break;
        case 4: // mars
            i = rads(1.85061 - 0.000000193703 * d);
            o = rads(49.57854 - 0.0000077587 * d);
            p = rads(336.04084 + 0.00001187 * d);
            a = 1.52366231 - 0.000000001977 * d;
            E = 0.09341233 - 0.00000000325859 * d;
            L = range2pi(rads(355.45332 + 0.524033035 * d));
            break;
        case 5: // jupiter
            i = rads(1.3053 - 0.0000000315613 * d);
            o = rads(100.55615 + 0.00000925675 * d);
            p = rads(14.75385 + 0.00000638779 * d);
            a = 5.20336301 + 0.0000000166289 * d;
            E = 0.04839266 - 0.00000000352635 * d;
            L = range2pi(rads(34.40438 + 0.083086762 * d));
            break;
        case 6: // saturn
            i = rads(2.48446 + 0.0000000464674 * d);
            o = rads(113.71504 - 0.0000121 * d);
            p = rads(92.43194 - 0.0000148216 * d);
            a = 9.53707032 - 0.0000000825544 * d;
            E = 0.0541506 - 0.0000000100649 * d;
            L = range2pi(rads(49.94432 + 0.033470629 * d));
            break;
        case 7: // uranus
            i = rads(0.76986 - 0.0000000158947 * d);
            o = rads(74.22988 + 0.0000127873 * d);
            p = rads(170.96424 + 0.0000099822 * d);
            a = 19.19126393 + 0.0000000416222 * d;
            E = 0.04716771 - 0.00000000524298 * d;
            L = range2pi(rads(313.23218 + 0.011731294 * d));
            break;
        case 8: // neptune
            i = rads(1.76917 - 0.0000000276827 * d);
            o = rads(131.72169 - 0.0000011503 * d);
            p = rads(44.97135 - 0.00000642201 * d);
            a = 30.06896348 - 0.0000000342768 * d;
            E = 0.00858587 + 0.000000000688296 * d;
            L = range2pi(rads(304.88003 + 0.0059810572 * d));
            break;
        case 9: // pluto
            i = rads(17.14175 + 0.0000000841889 * d);
            o = rads(110.30347 - 0.0000002839 * d);
            p = rads(224.06676 - 0.00000100578 * d);
            a = 39.48168677 - 0.0000000210574 * d;
            E = 0.24880766 + 0.00000000177002 * d;
            L = range2pi(rads(238.92881 + 0.00397557152635181 * d));
            break;
    }

    return {
        i,
        o,
        p,
        a,
        E,
        L
    };
}

function kepler(m, ecc, eps = 8) {
    let E = m; // first guess
    let delta = 0.05; // initial value for delta to enter the loop
    const tenToNegativeEps = Math.pow(10, -eps); // calculating the convergence threshold once

    while (Math.abs(delta) >= tenToNegativeEps) {
        // iterate until the solution converges within the desired precision
        delta = E - ecc * Math.sin(E) - m;
        E -= delta / (1 - ecc * Math.cos(E));
    }

    let v = 2 * Math.atan(Math.sqrt((1 + ecc) / (1 - ecc)) * Math.tan(0.5 * E));
    if (v < 0) {
        v += 2 * Math.PI; // ensure the anomaly is in the range 0 to 2π
    }
    return v;
}

function rads(degree) {
    return degree * Math.PI / 180;
}

function range2pi(angle) {
    let twoPi = 2 * Math.PI;
    return angle - twoPi * Math.floor(angle / twoPi);
}

function recliptic(x, y, z, d, index) {
    let obl = obliquity(d); // Ensure obliquity function is defined or implemented in JavaScript

    switch (index) {
        case 1:
            return x;
        case 2:
            return y * degCos(obl) + z * degSin(obl); // Assuming degCos and degSin are implemented
        case 3:
            return -y * degSin(obl) + z * degCos(obl);
        default:
            return null; // Return null or an appropriate value for an invalid index
    }
}

function obliquity(d) {
    let t = d / 36525; // Julian centuries since J2000.0
    let obliquity = -(46.815 + (0.00059 - 0.001813 * t) * t) * t / 3600;
    obliquity = obliquity + 23.43929111;
    return obliquity;
}

function degCos(degrees) {
    return Math.cos(degreesToRadians(degrees));
}

function degSin(degrees) {
    return Math.sin(degreesToRadians(degrees));
}

function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function sequatorial(r, theta, phi, d, index) {

    let x = rectangular(r, theta, phi, 1);
    let y = rectangular(r, theta, phi, 2);
    let z = rectangular(r, theta, phi, 3);

    return spherical(
        requatorial(x, y, z, d, 1),
        requatorial(x, y, z, d, 2),
        requatorial(x, y, z, d, 3),
        index
    );
}

function rectangular(r, theta, phi, index) {
    let r_cos_theta;

    r_cos_theta = r * degCos(theta);

    switch (index) {
        case 1:
            return r_cos_theta * degCos(phi);
        case 2:
            return r_cos_theta * degSin(phi);
        case 3:
            return r * degSin(theta);
        default:
            return null;
    }
}

function requatorial(x, y, z, d, index) {
    let obl;
    obl = obliquity(d)
    switch (index) {
        case 1:
            return x;
        case 2:
            return y * degCos(obl) - z * degSin(obl);
        case 3:
            return y * degSin(obl) + z * degCos(obl);
        default:
            return null;
    }
}

function spherical(x, y, z, index) {
    let rho = x * x + y * y;
    switch (index) {
        case 1: // r
            return Math.sqrt(rho + z * z)
        case 2: // theta
            return degArctan(z / Math.sqrt(rho))
        case 3: // phi
            return degAtan2(y, x);
        default:
            return null;
    }
}

function degArctan(x) {
    return Math.atan(x) * parameter.degs;
}

function degAtan2(y, x) {
    let result = atan2(y, x) * parameter.degs;
    if (result < 0) {
        result += 360;
    }
    return result;
}

function atan2(y, x) {
    let theta;

    if (Math.abs(x) < 0.0000001) {
        if (Math.abs(y) < 0.0000001) {
            theta = 0.0;
        } else if (y > 0.0) {
            theta = 1.5707963267949;
        } else {
            theta = -1.5707963267949;
        }
    } else {

        theta = Math.atan(y / x);

        if (x < 0) {
            if (y >= 0.0) {
                theta += 3.14159265358979;
            } else {
                theta -= 3.14159265358979;
            }
        }
    }

    return theta;
}

function range360(degrees) {
    return degrees - Math.floor(degrees / 360) * 360;
}


module.exports = {
    astroFcCalenAsHourDec1,
    astroFcCalenAsTimeAdj,
    astroSubCalenAsHourDec,
    astroFcCalenAsUniversalTime1,
    astroFcCalenAsDayAdj1,
    secliptic,
    jday,
    thaiSuriya,
    ayanamsa,
    day2000,
    moon,
    sun,
    planet,
}