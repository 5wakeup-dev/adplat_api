
// type TY_pageInfo = {
//   curPage: number;
//   pageBlock:number;
//   rowPerPage:number;
//   pagePerBlock:number;
//   totalRow:number;
//   virtualNum:number;
//   totalPage:number;
//   totalBlock:number;
//   startPage:number;
//   endPage:number;
//   isPrevBlock:number;
//   isNextBlock:number;
//   isPrevPage:number;
//   isNextPage:number;
//   startRow:number;
//   endRow:number;
// }

import { isNumberForm } from "../format.util";

export type PageInfoProps = {
  curPage?: number;
  totalRow: number;
  rowPerPage?: number;
  pagePerBlock?: number;
}

class PageInfo {
  curPage: number;
  pageBlock:number;
  rowPerPage:number;
  pagePerBlock:number;
  totalRow:number;
  virtualNum:number;
  totalPage:number;
  totalBlock:number;
  startPage:number;
  endPage:number;
  isPrevBlock:number;
  isNextBlock:number;
  isPrevPage:number;
  isNextPage:number;
  startRow:number;
  endRow:number;

  constructor({curPage, totalRow, rowPerPage, pagePerBlock}:PageInfoProps ){

    this.curPage =  isNumberForm(curPage) ? curPage : 1  ;
    this.totalRow = totalRow;
    this.rowPerPage = isNumberForm(rowPerPage) ? rowPerPage : 12;
    this.pagePerBlock = isNumberForm(pagePerBlock) ? pagePerBlock : 10;
    
    /*
    *  전체페이지수
    */
    this.totalPage = Math.ceil( this.totalRow / this.rowPerPage ) ;

    /*
    *  페이지계산
    */
    this.curPage = ( this.curPage > this.totalPage )	? 1 : this.curPage ;
    this.curPage = ( this.curPage < 1 )			? 1 : this.curPage ;

    /*
    *  블럭계산
    */
		this.pageBlock = Math.ceil(this.curPage / this.pagePerBlock);

    /*
    * 시작, 끝 로우
    */
    this.startRow = ( this.rowPerPage * (this.curPage - 1) );
		this.endRow = ( this.curPage == this.totalPage ) ? this.totalRow : ( this.rowPerPage * this.curPage );
    this.virtualNum = this.totalRow - this.startRow ;
    
    /* 
    * 전체블럭계산
    */
    this.totalBlock	= Math.ceil(this.totalPage / this.pagePerBlock) ; 

    /*
    * 시작, 끝 페이지
    */
    this.startPage = (this.pagePerBlock * (this.pageBlock - 1)) + 1 ;
    this.endPage = ( this.pageBlock == this.totalBlock ) ? this.totalPage : ( this.pagePerBlock * this.pageBlock ) ;
    if( this.totalBlock == 0 ) this.endPage = 0 ;

    /*
    * 이전, 다음 블럭 유무
    */
    this.isPrevBlock = ( this.pageBlock == 1 ) ? 0 : 1 ;
		this.isNextBlock = ( this.pageBlock != this.totalBlock && this.totalBlock != 0 ) ? 1 : 0 ;

    /*
    * 이전, 다음 페이지 유무
    */
    this.isPrevPage = ( this.curPage > 1 ) ? 1 : 0 ;
		this.isNextPage = ( this.curPage < this.endPage ) ? 1 : 0 ;
  }

}

export default PageInfo;