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
