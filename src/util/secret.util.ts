import {SHA3, mode, pad, format, AES, enc} from 'crypto-js';
// const key = enc.Hex.parse("000102030405060708090a0b0c0d0e0f");
// const iv = enc.Hex.parse("101112131415161718191a1b1c1d1e1f");

export const oneWayEnc = (txt: string, outputLength: number = 512 ):string|null => {
  if(!txt) return null;
  const hash = SHA3(txt, {outputLength});
  return hash.toString(enc.Hex);
}

export const aesEnc = (txt: string):string|null => {
  if(!txt) return null;
  const key = enc.Utf8.parse(process.env.SECRET_AES_KEY);
  const iv = enc.Utf8.parse(process.env.SECRET_AES_IV);
  const encrypter = AES.encrypt(txt, key, {
    iv,
    mode: mode.CBC,
    padding: pad.Pkcs7,
    format: format.OpenSSL
  })
  // console.log(encrypt.toString());
  return encrypter.toString();
  // const salt = process.env.SECRET_SALT;
  
  // console.log()
  // const encWord = algo.AES.createEncryptor(key, {iv}).process(txt);
  // const decWord = algo.AES.createDecryptor(key, {iv}).process(encWord);
  // console.log(txt, encWord, decWord);
  // return AES.encrypt(txt, salt).toString();

  // return AES.encrypt(txt, salt);
}
export const aesDec = (decTxt: string):string|null => {
  if(!decTxt) return null;
  const key = enc.Utf8.parse(process.env.SECRET_AES_KEY);
  const iv = enc.Utf8.parse(process.env.SECRET_AES_IV);
  const decrypter = AES.decrypt(decTxt, key, {
    iv,
    mode: mode.CBC,
    padding: pad.Pkcs7,
    format: format.OpenSSL
  })
  return decrypter.toString(enc.Utf8);

  // const salt = process.env.SECRET_SALT;
  // return AES.decrypt(decTxt, salt).toString(enc.Utf8);
}