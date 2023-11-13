const _makeHash = (arr:Array<string>): Record<number, number> => {
  const length = arr.length,
      hash: Record<number, number> = { 0: 0 }
      ;
  for (var i = 0; i < length; i++) 
    if (arr[i])
      hash[arr[i].charCodeAt(0)] = i;
  
  return hash;
}

const _makeComplexHash = (array: Array<Array<string>>): Record<number, Record<number, number>> => {
  const length = array.length
  let hash: Record<number, Record<number, number>> = {};
  for (var i = 0; i < length; i++) {
      const code1: number = array[i][0].charCodeAt(0);
      const code2: number = array[i][1].charCodeAt(0);
      if (typeof hash[code1] === 'undefined') {
          hash[code1] = {};
      }
      hash[code1][code2] = array[i][2].charCodeAt(0);
  }
  return hash;
}

const CHO = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ',
  'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ',
  'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ',
  'ㅍ', 'ㅎ'
],
/* Disassembled 중성(nucleus) */
JUNG = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ',
  'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', ['ㅗ', 'ㅏ'], ['ㅗ', 'ㅐ'],
  ['ㅗ', 'ㅣ'], 'ㅛ', 'ㅜ', ['ㅜ', 'ㅓ'], ['ㅜ', 'ㅔ'], ['ㅜ', 'ㅣ'],
  'ㅠ', 'ㅡ', ['ㅡ', 'ㅣ'], 'ㅣ'
],
/* Desassembled 종성(coda) */
JONG = [
  '', 'ㄱ', 'ㄲ', ['ㄱ', 'ㅅ'], 'ㄴ', ['ㄴ', 'ㅈ'], ['ㄴ', 'ㅎ'], 'ㄷ', 'ㄹ',
  ['ㄹ', 'ㄱ'], ['ㄹ', 'ㅁ'], ['ㄹ', 'ㅂ'], ['ㄹ', 'ㅅ'], ['ㄹ', 'ㅌ'], ['ㄹ', 'ㅍ'], ['ㄹ', 'ㅎ'], 'ㅁ',
  'ㅂ', ['ㅂ', 'ㅅ'], 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
],
/* 유니코드 한글 시작 위치 */
HANGUL_OFFSET = 0xAC00, 
/* 자음 */
CONSONANTS = [
  'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄸ',
  'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ',
  'ㅁ', 'ㅂ', 'ㅃ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ',
  'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
],
/* Assembled 초성 */
COMPLETE_CHO = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ',
  'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ',
  'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
],
/* Assembled 중성 */
COMPLETE_JUNG = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ',
  'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ',
  'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ',
  'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'
],
/* Assembled 종성 */
COMPLETE_JONG = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ',
  'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ',
  'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
],
/* 복잡한 자음: [ 자음1, 자음2, 자음1+자음2 ] */
COMPLEX_CONSONANTS = [
  ['ㄱ', 'ㅅ', 'ㄳ'],
  ['ㄴ', 'ㅈ', 'ㄵ'],
  ['ㄴ', 'ㅎ', 'ㄶ'],
  ['ㄹ', 'ㄱ', 'ㄺ'],
  ['ㄹ', 'ㅁ', 'ㄻ'],
  ['ㄹ', 'ㅂ', 'ㄼ'],
  ['ㄹ', 'ㅅ', 'ㄽ'],
  ['ㄹ', 'ㅌ', 'ㄾ'],
  ['ㄹ', 'ㅍ', 'ㄿ'],
  ['ㄹ', 'ㅎ', 'ㅀ'],
  ['ㅂ', 'ㅅ', 'ㅄ']
],
/* 복잡한 모음: [모음1, 모음2, 모음1+모음2] */
COMPLEX_VOWELS = [
  ['ㅗ', 'ㅏ', 'ㅘ'],
  ['ㅗ', 'ㅐ', 'ㅙ'],
  ['ㅗ', 'ㅣ', 'ㅚ'],
  ['ㅜ', 'ㅓ', 'ㅝ'],
  ['ㅜ', 'ㅔ', 'ㅞ'],
  ['ㅜ', 'ㅣ', 'ㅟ'],
  ['ㅡ', 'ㅣ', 'ㅢ']
],
CONSONANTS_HASH = _makeHash(CONSONANTS),
CHO_HASH = _makeHash(COMPLETE_CHO),
JUNG_HASH = _makeHash(COMPLETE_JUNG),
JONG_HASH = _makeHash(COMPLETE_JONG),
COMPLEX_CONSONANTS_HASH = _makeComplexHash(COMPLEX_CONSONANTS),
COMPLEX_VOWELS_HASH = _makeComplexHash(COMPLEX_VOWELS);

/* c 가 CONSONANTS의 멤버일 경우 true 반환 (c가 자음일 경우 true 반환) */ 
const _isConsonant = (c: number):boolean => 
  typeof CONSONANTS_HASH[c] !== 'undefined';

/* c 가 COMPLETE_JUNG의 멤버일 경우 true 반환 (c 가 초성일 경우 true 반환) */
const _isCho = (c: number):boolean => 
  typeof CHO_HASH[c] !== 'undefined';

/* c 가 COMPLETE_JUNG의 멤버일 경우 true 반환 (c 가 중성일 경우 true 반환) */
const _isJung = (c: number):boolean => 
  typeof JUNG_HASH[c] !== 'undefined';

/* c 가 COMPLETE_JONG의 멤버일 경우 true 반환 (c 가 종성일 경우 true 반환) */
// const _isJong = (c: number):boolean => 
//   typeof JONG_HASH[c] !== 'undefined';

/* c 가 한글일 경우 true 반환 */
const _isHangul = (c: number):boolean => 
  0xAC00 <= c && c <= 0xd7a3;

/* a와 b가 중성으로서 결합할 수 있는 경우 COMPLEX_VOWELS_HASH[a][b] 값(결합한 종성의 유니코드 값) 반환 */
// const _isJungJoinable = (a:number, b:number) => 
//   (COMPLEX_VOWELS_HASH[a] && COMPLEX_VOWELS_HASH[a][b]) ? COMPLEX_VOWELS_HASH[a][b] : false;

/* a와 b가 종성으로서 결합할 수 있는 경우 COMPLEX_CONSONANTS_HASH[a][b] 값(결합한 종성의 유니코드 값) 반환 */
// const _isJongJoinable = (a:number, b:number) => 
//   COMPLEX_CONSONANTS_HASH[a] && COMPLEX_CONSONANTS_HASH[a][b] ? COMPLEX_CONSONANTS_HASH[a][b] : false;


type Disassemble = {
  syllable: Array<string>;
  chosung: Array<string>;
  groups: Array<Array<string>>;
}

export const disassemble = (str: string): Disassemble => {
  /* 입력값이 NULL일 경우 에러 발생 */
  if (!str) 
    throw new Error('Arguments cannot be null');
  
  // /* 입력값이 'object' 타입인 경우 문자열로 병합 */
  // if (typeof string === 'object') 
  //     string = string.join('');
  
  const syllable:Array<string> = [],
    chosung: Array<string> = [],
    groups: Array<Array<string>> = [],
    length = str.length;
  let cho: number,
      jung: number,
      jong: number,
      code: number,
      r:any
      ;
  /* 모든 문자에 대해 확인 */
  for (let i = 0; i < length; i++) {
      let temp = [];
      
      code = str.charCodeAt(i); //문자를 유니코드값으로 변환해 code에 저장
      /* i번째 문자(code)가 완성된 한글인 경우 */
      if (_isHangul(code)) {
          code -= HANGUL_OFFSET;
          jong = code % 28;
          jung = (code - jong) / 28 % 21;
          cho = parseInt(`${(code - jong) / 28 / 21}`);
          temp.push(CHO[cho]); // temp 배열에 초성 추가
          /* 중성이 object형인 경우 (2 단일 모음의 조합인 경우) */
          if (typeof JUNG[jung] === 'object') {
              temp = temp.concat(JUNG[jung]); // temp에 해당 중성의 모음들 추가
          /* 중성이 단일 모음으로 이루어진 경우 */
          } else {
              temp.push(JUNG[jung]); // temp에 해당 모음 추가
          }
          /* 종성이 있는 경우 */
          if (jong > 0) {
              /* 종성이 object형인 경우 (2 단일 자음의 조합인 경우) */
              if (typeof JONG[jong] === 'object') {
                  temp = temp.concat(JONG[jong]); // temp에 해당 종성의 자음들 추가
              /* 종성이 단일 자음으로 이루어진 경우 */
              } else {
                  temp.push(JONG[jong]); // temp에 해당 자음 추가
              }
          }
      /* i번째 문자(code)가 완성된 한글이 아니면서 CONSONANTS의 멤버일 경우 (자음일 경우)*/    
      } else if (_isConsonant(code)) {
          if (_isCho(code)) {
              r = CHO[CHO_HASH[code]]; // 초성일 경우 해당 초성을 r에 저장
          } else {
              r = JONG[JONG_HASH[code]]; // 종성일 경우 해당 종성을 r에 저장
          }
          if (typeof r === 'string') {
              temp.push(r); // r이 string 형일 경우 temp에 추가
          } else {
              temp = temp.concat(r); // 아닐 경우 temp에 r 배열의 요소들 추가
          }
      /* i번째 문자(code)가 완성된 한글이 아니면서 COMPLETE_JUNG의 멤버일 경우 (중성일 경우) */
      } else if (_isJung(code)) {
          r = JUNG[JUNG_HASH[code]]; // r에 해당 중성 저장
          if (typeof r === 'string') {
              temp.push(r); // r이 string 형일 경우 temp에 추가
          } else {
              temp = temp.concat(r); // 아닐 경우 temp에 r 배열의 요소들 추가
          }
      /* i번째 문자(code)가 한글이 아닐 경우 */
      } else {
          temp.push(str.charAt(i)); // temp에 i번째 문자를 추가
      }
      temp.forEach(char => syllable.push(char));
      chosung.push(temp[0]);
      groups.push(temp);
      // if (grouped) result.push(temp); //grouped가 설정된 경우 result에 temp 추가
      // else result = result.concat(temp); //grouped가 설정되지 않은 경우 result에 temp의 요소들 추가
  }

  return {
    syllable,
    chosung,
    groups
  };
}
