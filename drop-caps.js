// Written by scripts/fit_drop_caps.mjs; do not edit by hand.
//
// For each capital: [fit, lead]. fit is the right margin of the drop cap in
// its own em, which is where line 2 starts. lead is where line 1 starts from
// there, in em of the body text: negative where the opening word runs in over
// the capital's leg or foot. The distances behind them are in the script.
export const FIT = {
    A: [0.1208, -1.027],
    B: [0.0196, -0.049],
    C: [-0.0223, 0.065],
    D: [0.0234, 0.014],
    E: [0.0355, -0.051],
    F: [-0.0411, 0.088],
    G: [0.0034, -0.117],
    H: [-0.0028, -0.144],
    I: [0.0193, -0.237],
    J: [-0.0773, 0.102],
    K: [0.0457, -0.459],
    L: [0.0831, -1.178],
    M: [-0.0110, -0.205],
    N: [-0.0776, 0.090],
    O: [0.0184, -0.058],
    P: [-0.0710, 0.373],
    Q: [0.0279, -0.190],
    R: [0.0420, -0.659],
    S: [0.0142, -0.094],
    T: [-0.0489, 0.231],
    U: [-0.0684, 0.168],
    V: [-0.0524, 0.025],
    W: [-0.0399, 0.026],
    X: [0.0279, -0.284],
    Y: [-0.0214, 0.025],
    Z: [0.0323, -0.081],
};

// After a one-letter word ("O Lord") line 1 keeps a thin space in place of
// the word space, as the 2019 St. Tikhon's prayer book sets it.
export const ONE_LETTER_LEAD = 0.16;
