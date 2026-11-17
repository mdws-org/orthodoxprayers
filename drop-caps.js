// Written by scripts/fit_drop_caps.mjs; do not edit by hand.
//
// For each capital: [fit, lead]. fit is the right margin of the drop cap in
// its own em, which places line 2 0.14em of the body text from the
// capital's ink (negative where the line tucks under an overhang). lead is
// how much further right line 1 starts, in em of the body text.
export const FIT = {
    A: [0.045, 0.000],
    B: [0.003, 0.000],
    C: [-0.014, 0.000],
    D: [0.004, 0.000],
    E: [0.019, 0.000],
    F: [-0.041, 0.195],
    G: [0.008, 0.000],
    H: [0.008, 0.000],
    I: [0.024, 0.000],
    J: [-0.076, 0.299],
    K: [0.047, 0.000],
    L: [0.033, 0.000],
    M: [0.009, 0.000],
    N: [-0.059, 0.300],
    O: [-0.003, 0.000],
    P: [-0.071, 0.280],
    Q: [-0.003, 0.000],
    R: [0.045, 0.000],
    S: [-0.002, 0.000],
    T: [-0.049, 0.300],
    U: [-0.058, 0.300],
    V: [-0.042, 0.300],
    W: [-0.037, 0.300],
    X: [0.033, 0.000],
    Y: [-0.011, 0.300],
    Z: [0.024, 0.000],
};

// After a one-letter word ("O Lord") line 1 keeps a thin space in place of
// the word space, as the 2019 St. Tikhon's prayer book sets it.
export const ONE_LETTER_LEAD = 0.16;

// BETA ONLY: the fit measured against the printed book (St. Tikhon's morning
// and evening prayers), for all twenty-six capitals. Line 1 runs in to the
// capital at the book's distance, so a lead may be negative; the site's own
// engine sets such a line, the library does not. Line 2 stands off the
// capital's rightmost ink below line 1's baseline (the widest point of a
// round letter) by the book's distance. Letters the book does not use are
// fitted after the nearest shape; F, P and T keep line 2 under the arm or
// bowl.
export const FIT_BOOK = {
    A: [0.1209, -1.028],
    B: [0.0196, -0.049],
    C: [-0.0223, 0.065],
    D: [0.0235, 0.014],
    E: [0.0355, -0.051],
    F: [-0.0410, 0.088],
    G: [0.0034, -0.117],
    H: [-0.0029, -0.144],
    I: [0.0192, -0.237],
    J: [-0.0772, 0.101],
    K: [0.0458, -0.459],
    L: [0.0830, -1.177],
    M: [-0.0110, -0.205],
    N: [-0.0775, 0.089],
    O: [0.0185, -0.058],
    P: [-0.0710, 0.373],
    Q: [0.0279, -0.190],
    R: [0.0420, -0.659],
    S: [0.0141, -0.093],
    T: [-0.0490, 0.231],
    U: [-0.0685, 0.168],
    V: [-0.0525, 0.026],
    W: [-0.0399, 0.026],
    X: [0.0280, -0.285],
    Y: [-0.0215, 0.026],
    Z: [0.0322, -0.080],
};
