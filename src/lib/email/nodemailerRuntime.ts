import type nodemailerTypes from 'nodemailer';

// NextAuth 4 optionally peers on Nodemailer 7. Root mail delivery uses the
// security-pinned Nodemailer 9 alias without satisfying that incompatible peer.
const nodemailerRuntime = require('nodemailer9') as typeof nodemailerTypes;

export type { Transporter } from 'nodemailer';
export default nodemailerRuntime;
