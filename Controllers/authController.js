import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function signup_get(req, res) {
    res.sendFile(path.join(__dirname, '../public/signup.html'));
}

export function login_get(req, res) {
    res.sendFile(path.join(__dirname, '../public/login.html'));
}

export function signup_post(req, res) {
    const {email, name} = req.body
    console.log(name + " " + email)
    res.send('new signup')
}

export function login_post(req, res) {
    const {email, name} = req.body
    console.log(name + " " + email)
    res.send('you are loged in');
}


export default {
    signup_get,
    signup_post,
    login_get,
    login_post,
}