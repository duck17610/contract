import React, {useState, useEffect, useRef  } from 'react'
import KeepAlive from 'react-activation'
import 'antd/dist/antd.less';
import { StickyContainer } from 'react-sticky';
import { Helmet } from 'react-helmet';
import { Tabs , Carousel } from 'antd';
import { handleSubscription, handleAddress, handleSubAddress, getCookie, changePageTitle, handleFilterConditionFunc,handleFilterCondition } from 'utils';
import { moreExport } from "apis";
import { useLocalStorageState,useMount, useUnmount } from 'ahooks';
import { history ,  useLocation } from 'umi';
import { ActivityIndicator, Toast,Icon } from "@ui/mobile";
import Filter from 'components/Filter';
import MemberPop from 'components/MemberPop'
import ExportToEmail from 'components/ExportToEmail'
import { ReactComponent as Edit } from 'imgs/edit.svg';
import subscriptopnBg from 'imgs/subscriptopnBg.png'
import memberTwoBg from 'imgs/memberTwo.png'
import shareFriendBg from 'imgs/shareFriends.png'
import { getProposed } from 'components/ProposedList/apis';
import getUrlParam from 'utils/getUrlParam'
import getHashParam from 'utils/getHashParam';
import * as dd from 'dingtalk-jsapi'
import openLink from 'dingtalk-jsapi/api/biz/util/openLink';
import {memberTwo, shareFriends} from 'constants/base64';
import styles from './index.less';
import { SUBSCRIPTIONTABS, PROPDATA, PROPSETTINGS,MemberType} from './constants/index';
import InfiniteScrolls from './components/InfiniteScrolls';
import { getSubscription , userVipinfoList } from '../subscription/apis/index'
import { getAnnouncement } from '../../../components/NoticeList/apis';
import{getEmail} from '../../../components/ShareAndCollect/apis'
import { NOTICE_CONFIG,PP_CONFIG } from '../subscription/constants';
import Settings from '../settings/index'
import Subscriptions from '../../guide/index/index'
import logTrack from '../../../utils/buridePoint/index'

const contentStyle = {
  width:'100%',
  color: '#fff',
  height:'52px',
  textAlign: 'center',
  background: '#fff',
};

/**
 * 招标、拟在建、采购
*/

function SubscriptionPages(){
  const { TabPane } = Tabs;
  const [loading, setLoading] = useState(false);
  const [needLoading,setNeedLoading] = useState(false);
  const [tabsList,setTabsList] = useState(SUBSCRIPTIONTABS)
  const [propJson,setPropJson] = useState(PROPDATA) // scroll 列表中传的数据
  const [propSettings,setPropSettings] = useState(PROPSETTINGS) // 订阅设置 列表中传的数据
  const [addressArr, setAddressArr] = useState({});
  const [subAddress, setSubAddress] = useState({});
  const [keywords, setKeywords] = useState({});
  const [condition, setCondition] = useState({
    publish: {
      biddingRegion:['',''],
      keyword:[''],
      biddingAnncPubTime:'',
    },
    proposed: {
      ppRegion:['',''],
      keyword:[''],
      ppApprovalTime:'',
    },
    win: {
      biddingRegion:['',''],
      keyword:[''],
      biddingAnncPubTime:'',
    },
  });
  const keyArr = [
    'biddingRegion',
    'biddingAnncType',
    'biddingAmount',
    'biddingAnncPubTime',
    'searchMode',
  ];
  const proposedKeyArr = [
    'ppRegion',
    'ppApprovalResult',
    'ppApprovalTime',
    'searchMode',
  ];
  const isSubscription = true;
  const pageSize = 20;
  const [subscriptionArr,setSubscriptionArr] = useState([]) // 招标
  const [proposedArr,setProposedArr] = useState([]);// 拟在建
  const [winArr,setWinArr] = useState([]);// 中标
  const [subscriptionTotal,setSubscriptionTotal] = useState();
  const [urlType,setUrlType] = useState("publish");
  const [settingPage,setSettingPages] = useState(false);
  const urlRef = useRef(); // tab type 变化
  const tabs = [
    { id:"tab1", title: '招标采购', key: 'publish'},
    { id:"tab2", title: '拟在建项目', key: 'proposed'},
    { id:"tab3", title: '中标结果', key: 'win'},
  ];
  const [showImg, setShowImg] = useState(true);
  const [currentTitle,setCurrentTitle] = useState('招标采购')  // 标题
  const [currentFilterConfig,setCurrentFilterConfig] = useState([])
  const [isFirst,setIsFirst] = useState(true);
  const conditionRef = useRef(); // 地区筛选变化
  const keywordRef = useRef(); // 订阅产品筛选变化
  const [activeKey,setActiveKey] = useState()
  const [tipShow, setTipShow] = useState(false);
  const [needStroageArr,setNeedStroageArr] = useState([]);
  // const [stroageArr,setStroageArr] = useLocalStorageState("needStroageArr",needStroageArr)
  const [stroageUrlRef,setStroageUrlRef] = useLocalStorageState("urlType",urlType)
  // 是否为会员
  const [isVip,setIsVip] = useState(false);
  // 是否展示开通VIP会员的弹窗
  const [showPop,setShowPop] = useState(false);
  const [showItemEidt,setShowItemEidt] = useState(false);
  const[selectList,setSelectList] = useState([])
  const [openEmail,setOpenEmail] = useState(false);
  const [defaultEmail,setDefaultEmail] = useState('')
  const list =  urlRef.current === 'publish' ? subscriptionArr : (urlRef.current === 'proposed')? proposedArr : winArr
  const {query} = useLocation();
  const {showSettingPages} = query;

  useMount(() => {
    conditionRef.current = condition
    keywordRef.current = '';
    changePageTitle(`订阅-${currentTitle}`);
    executionMethod()
    logTrackFunc("subscription_status","status",{page:MemberType[urlRef.current]})
  })

  const executionMethod =() => {
    getSubscriptionInfo(isFirst)
    judgeUserVip();    // 判断是否是会员
    getDetDeFaultEmail()
  }

  useUnmount(() => {
    setStroageUrlRef(urlRef.current)
  })

  useEffect(() =>{
    if(history.location && history.location.pathname==='/home/SubscriptionPage'){
      changePageTitle(`订阅-${currentTitle}`);
    }
  },[history.location])

  useEffect(() =>{
    if(!showSettingPages&&settingPage){
      setSettingPages(false)
    }
  },[showSettingPages,settingPage])

  useEffect(() => {
    urlRef.current = urlType
    const currentPropItem = propJson.find(item => item.type === urlType)
    const urlPage = currentPropItem.page
    changePageTitle(`订阅-${currentTitle}`);
    if(urlType === "publish" && !subscriptionArr.length){
      fetchAnnouncement(urlPage,keywords,subAddress)
    }else if(urlType === "proposed" && !proposedArr.length){
      fetchAnnouncement(urlPage,keywords,subAddress)
    }else if(urlType === "win" && !winArr.length) {
      fetchAnnouncement(urlPage,keywords,subAddress)
    }
  },[urlType])

  useEffect(() => {
    conditionRef.current = condition // 更改当前地图选中的内容
  },[condition])

  useEffect(() => {
    switch(urlRef.current) {
      case (urlRef.current==='publish'):
        setNeedStroageArr([...subscriptionArr])
        break;
      case (urlRef.current==='proposed'):
        setNeedStroageArr([...proposedArr])
        break;
      case (urlRef.current==='win'):
        setNeedStroageArr([...winArr])
        break;
      default:
        setNeedStroageArr([...subscriptionArr])
        break
    }    
    // 根据长度存缓存
  },[subscriptionArr,proposedArr,winArr])


  useEffect(() => {
    if(tipShow){
      const timer = setTimeout(() => {
        setTipShow(false)
        clearTimeout(timer);
      }, 3000);
    } 
  },[tipShow])

  /**
   * 查订阅关键词
   * @param(type(integer, optional) 订阅类型(0第一次引导，1招标，2中标，3拟在建，4资质到期))
   */
  const getSubscriptionInfo = (isFirst1) => {
    setLoading(true)
    getSubscription().then(res => {
      const wordList = res && res.UserSubscribeDingdings || [];    
      // 关键词
      const newKeyWord = {
        publish: handleSubscription(wordList, 1),
        proposed: handleSubscription(wordList, 3),
        win: handleSubscription(wordList, 2),
      }
      // 地址
      const newAddressArr = {
        publish: handleAddress(wordList, 1),
        proposed: handleAddress(wordList, 3),
        win: handleAddress(wordList, 2),
      }

      const newSubAddress = {
        publish: handleSubAddress(wordList, 1),
        proposed: handleSubAddress(wordList, 3),
        win: handleSubAddress(wordList, 2),
      }

      setAddressArr(newAddressArr)
      setSubAddress(newSubAddress)
      setKeywords(newKeyWord)
      keywordRef.current  = urlRef.current === 'publish' ? ( Object.keys(newKeyWord).length ? newKeyWord.publish.toString() : '') : (urlRef.current === 'proposed' ? ( Object.keys(newKeyWord).length ? newKeyWord.proposed.toString() : '') : ( Object.keys(newKeyWord).length ? newKeyWord.win.toString() : '') )
      updateProp(newKeyWord,newAddressArr,newSubAddress,isFirst1)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
      setKeywords([])
    })
  }

  /**
   * 获取公告详情
   * @params(_page (根据当前tab类型进行区分))
   */
  const fetchAnnouncement = (_page,newKeyWords,newSubAddress) => {
    setNeedLoading(true)
    if(keywordRef.current === '') return
    const subAddressNew = urlRef.current === 'publish' ? newSubAddress.publish : (urlRef.current === 'proposed' ? newSubAddress.proposed : newSubAddress.win  )
    const restProp ={
      isSubscription,
      subAddress:subAddressNew,
    }
    if(urlRef.current === 'proposed'){
      const proposedProp = {
        begin: (_page - 1) * pageSize,
        end: _page * pageSize,
        keyword:keywordRef.current.replace(/,/g," "),  // 去除keyword 中的逗号,改成空格，不然会导致bug
        ...handleFilterConditionFunc(proposedKeyArr, ((conditionRef.current ?? '') !=='') ? conditionRef.current.proposed : condition.proposed, restProp, urlRef.current),
      }
      // 中建查询接口异常处理
      try {
        proposedSearch(proposedProp,_page)
      } catch (error) {
        setNeedLoading(false)
      }
    }else {
      const conditionRefs = (conditionRef.current ?? '') !=='' ? (urlRef.current==='publish' ?  conditionRef.current.publish :  conditionRef.current.win) : (urlRef.current==='publish' ? condition.publish : condition.win)
      const prop = {
        annc_type:urlRef.current,
        begin: (_page - 1) * pageSize,
        end: _page * pageSize,
        sort: 0,
        keyword:keywordRef.current.replace(/,/g," "),  // 去除keyword 中的逗号,改成空格，不然会导致bug
        ...handleFilterConditionFunc(keyArr, conditionRefs, restProp, urlRef.current),
      }
      // 招标查询接口异常处理
      try {
        publishSearch(prop,_page)
      } catch (error) {
        setNeedLoading(false)
      }
    }    
  }

  /**
   * 招标采购、中标
   * @param {*} prop 
   * @param {*} _page 
   */
  const publishSearch =(prop,_page) => {
    getAnnouncement(prop)
      .then(res => {
        updateUrlPage(_page+1) // 更新page
        const newData = res && res.data || [];
        setSubscriptionTotal(res.total);
        if (_page === 1) {
          urlRef.current === 'publish' ? setSubscriptionArr([...newData]) :  setWinArr([...newData])
        }else {
          const listArray = urlRef.current === 'publish' ? [...subscriptionArr, ...newData] : [...winArr, ...newData]
          urlRef.current === 'publish' ? setSubscriptionArr([...listArray]) : setWinArr([...listArray])
        }
        logTrackFunc('subscription_return','status',{page:MemberType[urlRef.current],filter:currentFilterConfig,return_num:newData.length})
        setTipShow(true)
        setNeedLoading(false)
      }).catch(e => {
        setNeedLoading(false)
        updateUrlPage(_page) // 更新page
      });
      
  }

  /**
   * 拟在建
   * @param {*} prop 
   * @param {*} _page 
   */
  const proposedSearch =(prop,_page) =>{
    getProposed(prop, _page, pageSize).then(res => {
      const newData = res && res.data || [];
      if (_page === 1) {
        setProposedArr([...newData])
      } else {
        const listArray = [...proposedArr, ...newData] 
        setProposedArr([...listArray])
      }
      setNeedLoading(false)
      logTrackFunc('subscription_return','status',{page:MemberType[urlRef.current],filter:currentFilterConfig,return_num:newData.length})
    }).catch(e => {
      setNeedLoading(false)
      const { data: { err } } = e
    });
    
  }

  /**
   * setPropJson 更新相应url对应的page
   * @param page
   */
  const updateUrlPage = (page) => {
    propJson.filter((item) => {
      if(item.type === urlRef.current){
        item.page = Number(page)
      }
    } )
    setPropJson([...propJson])
  }

  /**
 * 
 */
  const updateProp = (newKeyWord,newAddressArr,newSubAddress,isFirst1) => {
    propJson.forEach(items => {
      items.newKeywords = newKeyWord
      items.subAddress = newSubAddress
    })
    // 第一次查关键词 初始化公告search接口参数keyword
    setPropJson([...propJson])
    propSettings.forEach(items => {
      items.newKeywords = newKeyWord
      items.iareas = newAddressArr
    })
    // 第一次查关键词 初始化订阅设置中的keyword，iares
    setPropSettings([...propSettings])
    const newConJson = {...condition}
    const con = {}
    Object.keys(newConJson).forEach((key) => {
      const innerJson = {}
      innerJson.keyword = newKeyWord[key]
      key==='proposed' ? innerJson.ppRegion = newAddressArr[key] : innerJson.biddingRegion = newAddressArr[key]
      key==='proposed' ? innerJson.ppApprovalTime = condition[key].ppApprovalTime : innerJson.biddingAnncPubTime = condition[key].biddingAnncPubTime
      con[key] = innerJson
    })
    setCondition(con)
    conditionRef.current = con
    const currentCon = urlRef.current === 'proposed' ? PP_CONFIG(newKeyWord[urlRef.current],newAddressArr[urlRef.current]) : NOTICE_CONFIG(newKeyWord[urlRef.current],newAddressArr[urlRef.current])
    setCurrentFilterConfig(currentCon)
    fetchAnnouncement(1,newKeyWord,newSubAddress)
    setIsFirst(false)
  }


  const judgeUserVip = () => {
    userVipinfoList().then((res) => {
      if (res?.UserVipinfo?.level > 5) {
        setShowImg(false)
        setIsVip(true)
      } else {
        setShowImg(true)
        setIsVip(false)
      }
    })
  }


  const onTabAction = (type) => {
    const items = tabs.find(item => item.key === type)
    keywordRef.current = Object.keys(keywords).length ? keywords[type].toString() : ''
    setUrlType(items.key)
    setCurrentTitle(items.title)
    const con = (type === 'proposed') ? PP_CONFIG(keywords[type],addressArr[type]) : NOTICE_CONFIG(keywords[type],addressArr[type])
    setCurrentFilterConfig(con)
    setActiveKey(items.key)
    setSelectList([])
    setShowItemEidt(false)
    logTrackFunc("subscription_status","status",{page:MemberType[type]}) // 到达页面埋点
  }

  // 重新订阅
  const resubscribe = () => {
    setSettingPages(true);
    const pathQuery = {
      ...query,
      showSettingPages: true,
    }
    history.push({
      pathname:'/home/subscriptionPage',
      query:pathQuery,
    })
    setSelectList([])
    setShowItemEidt(false)
  }

  const changePageShow =(status,updateSearch) =>{
    setSettingPages(false)
    if(updateSearch){
      getSubscriptionInfo(true)
    }
  }
  
  /**
   * 向导页订阅信息查询
   * @param {*} needSearch (true 需要更新,代表是新用户)
   */
  const onChangeGuide = (needSearch) => {
    if(needSearch){
      getSubscriptionInfo(true) // 先查关键词,再查订阅数据
    }
  }

  /**
   *  筛选条件变化
   * @param(con)
   */
  const onConditionChange = (con,needFilterUpdate,operate,label) => {
    const newCon = {
      ...condition,
      [urlType]: con,
    }
    keywordRef.current = con.keyword.toString() ? con.keyword.toString() : keywords[urlRef.current].toString() // 更新搜索关键词字段
    conditionRef.current = newCon
    setCondition(newCon);
    if(!needFilterUpdate) {
      fetchAnnouncement(1,keywords,newCon)
    }
    setSelectList([])
    setShowItemEidt(false)
    // 处理埋点内容
    handleLogTrackFunc(operate,label,newCon)
  }

  const handleLogTrackFunc =(operate,label,newCon) =>{
    if(keywordRef.current === '') return
    const subAddressNew = urlRef.current === 'publish' ? newCon.publish : (urlRef.current === 'proposed' ? newCon.proposed : newCon.win  )
    const restProp ={
      isSubscription,
      subAddress:subAddressNew,
    }
    if(urlRef.current === 'proposed'){
      const proposedProp = {
        keyword:keywordRef.current.replace(/,/g," "),  // 去除keyword 中的逗号,改成空格，不然会导致bug
        ...handleFilterConditionFunc(proposedKeyArr, ((conditionRef.current ?? '') !=='') ? conditionRef.current.proposed : condition.proposed, restProp, urlRef.current),
      }
      logTrackFunc('subscription_click_screen','click',{page:MemberType[urlRef.current],control:label,filter:proposedProp,operate}) // 更改筛选条件时触发
    }else {
      const conditionRefs = (conditionRef.current ?? '') !=='' ? (urlRef.current==='publish' ?  conditionRef.current.publish :  conditionRef.current.win) : (urlRef.current==='publish' ? condition.publish : condition.win)
      const prop = {
        keyword:keywordRef.current.replace(/,/g," "),  // 去除keyword 中的逗号,改成空格，不然会导致bug
        ...handleFilterConditionFunc(keyArr, conditionRefs, restProp, urlRef.current),
      }
      logTrackFunc('subscription_click_screen','click',{page:MemberType[urlRef.current],control:label,filter:prop,operate}) // 更改筛选条件时触发
    }
  }
  /**
   * 
   * @param {*} vip会员页面跳转
   * @returns 
   */
  const vipMemberPush = (status) => {
    const imgUrl = status ? subscriptopnBg : memberTwoBg
    history.push({
      pathname:'/member/join',
    })
    logTrackFunc('subscription_click_banner','click',{page:MemberType[urlRef.current],banner_url:imgUrl})
  }

  const sharePush = () => {
    history.push({
      pathname:'/share',
    })
    logTrackFunc('subscription_click_banner','click',{page:MemberType[urlRef.current],banner_url:shareFriendBg})
  }
  /**
 * 点击批量导出
 */
  const openItemSelect = () =>{
    logTrackFunc('subscription_export','click',{page:MemberType[urlRef.current]}) // 批量导出点击埋点
    if(!isVip){
      setShowPop(true);
      return 
    }
    if(showItemEidt){
      selectAll()
    }else{
      setShowItemEidt(true)
    }
  }
  // 选择回调
  const onSelect = (bool, data) => {
    let newSelect = [...selectList]
    if (bool) {
      newSelect.push(data._id)
    } else {
      newSelect = selectList.filter(item => item !== data._id)
    }
    setSelectList(newSelect)
  }
  
  // 全选
  const selectAll = () => {
    if (selectList.length === list.length) {
      setSelectList([])
      return
    }
    const newSelect = list.map(item => item._id)
    setSelectList(newSelect)
  }
  
  // 点击导出-完成
  const exportAll = () => {
    if (!selectList.length) {
      Toast.info('请选择要导出的项目', 2)
      return 
      // return
    }if (selectList.length >50){
      Toast.info('最多只能导出50条数据', 2)
    }
    setOpenEmail(true)
  }
  // 取消导出
  const cancelExport = () =>{
    setSelectList([])
    setShowItemEidt(false)
  }
  // 获取用户已填写的邮箱
  const getDetDeFaultEmail = () => {
    getEmail().then(res=>{
      if(res.stat === 1){
        const {
          data:{
            email,
          },
        } = res
        setDefaultEmail(email)
      }else{
        console.log('获取邮箱失败', 2) 
      }
    }).catch(() => { console.log('获取邮箱失败', 2) });
  }
  
  /**
   * 筛选右侧渲染 
   */
  const renderRight = () => (
    <div
      className={styles.filterRight}
      role="button"
      onClick={() => resubscribe()}
    >
      <Edit />订阅设置
    </div>
  )
  const confirm = (email) =>{
    const params = {
      dduserid: getCookie('userId'),
      email,
      exportIds:selectList,
      exportType: urlRef.current==='proposed'?'proposed' :'announcement',
    }
    moreExport(params).then(res=>{
      if(res.stat === 1){
        Toast.info('导出成功，稍后请您在邮箱中查看',1)
        setOpenEmail(false)
      }else{
        Toast.info('导出失败',1)
      }
    }).catch(()=>{
      Toast.info('导出失败',1)
    })
  }

  // 客户群入口
  const customerInter = () => {
    return (
      <div className={styles.customerBox} role='button' onClick={customerService}>
        <span className={styles.info}>信息</span>
        <span className={styles.info}>反馈</span>
      </div>
    )
  }

  const customerService = () => {
    const corpId = getUrlParam('corpId') || getHashParam('corpId')
    const url = `https://page.dingtalk.com/wow/dingtalk/act/serviceconversation?wh_biz=tm&showmenu=false&goodsCode=DT_GOODS_881640488205832&corpId=${corpId}&token=2a07dfc7364bbe0690ebfd0e3ed4d370`
    if (dd.env.platform !== "notInDingTalk") {
      dd.ready(() => {
        openLink({ url })
      })
    } else {
      Toast.info("此功能暂未开放");
    }
  }

  // 订阅埋点
  const logTrackFunc =(eventId,eventType ,properties) =>{
    logTrack(eventId,eventType,'subscriptionPage', properties ,'');   
  }

  return (
    <>
      <Helmet title={(currentTitle ?? '')!=='' ? `订阅-${currentTitle}` : `订阅-招标采购`} />
      <div className={styles.SubscriptionPage}>
        {loading ? (
          <ActivityIndicator toast text="正在加载" />
        ) : null}
        {
          !settingPage ? (
            <div className={styles.tabsBox}>
              <StickyContainer> 
                <Tabs activeKey={activeKey} onChange={onTabAction}>
                  {tabsList.map(item => (
                    <TabPane key={item.key} tab={item.name}>
                      <div className={styles.needSticky}>
                        <div className={styles.FilterBox}>
                          {currentFilterConfig.length ? (
                            <Filter 
                              config={currentFilterConfig}
                              key={item.key}
                              renderRight={renderRight}
                              onFilterChange={onConditionChange}
                              initCondition={(conditionRef.current ?? '') !=='' ? conditionRef.current[urlType] : condition[urlType]}
                              needHandle
                              moreline
                            />
                          ) : null}
                         
                        </div>
                        <div className={styles.SwiperBox} style={contentStyle} >
                          <KeepAlive>
                            <Carousel
                              autoplay
                              infinite
                              autoplayInterval={6000}>
                              <div className={styles.swiper}>
                                <img className={styles.swiperImg} src={showImg ? subscriptopnBg : memberTwo} style={contentStyle} alt=""  onClick={() => vipMemberPush(showImg)}/>
                              </div>
                              <div className={styles.swiper}>
                                <img className={styles.swiperImg} src={shareFriends} style={contentStyle} alt=""  onClick={() => sharePush()} />
                              </div>
                            </Carousel>
                          </KeepAlive>
                        </div>
                      </div>
                      <div id={item.type} style={{ height: '100vh', overflow: 'auto', width:'100vw'}}>
                        <InfiniteScrolls 
                          subscriptionArr={item.type === 'publish' ? subscriptionArr : (item.type === 'proposed' ? proposedArr : winArr)} 
                          propJson={propJson} 
                          totals={subscriptionTotal} 
                          onChange={fetchAnnouncement} 
                          resubscribeNoData={resubscribe}
                          keywordUrl={keywordRef.current}
                          urlTypeRef={item.type}
                          showItemEidt={showItemEidt}
                          selectList={selectList}
                          currentFilter={(conditionRef.current ?? '') !=='' ? conditionRef.current[urlType] : condition[urlType]}
                          loading={needLoading}
                          onSelect={onSelect}
                        />
                      </div>
                      <div className={styles.footer}>
                        {
                          needLoading ? (
                            <Icon type="loading" />
                          ) : null
                        }
                      </div>
                    </TabPane> 
                  ))} 
                </Tabs>
              </StickyContainer>
              <div className={styles.exportWrapper}>
                <div role="button" className={styles.export} onClick={()=>{openItemSelect()}}>{showItemEidt?selectList.length === list.length ?'取消全选':'全选':'批量导出'}</div>
              </div>
              {showItemEidt&& <div className={styles.handleExport}>
                <button 
                  type="button" 
                  onClick={()=>{
                    cancelExport()
                  }}>取消</button>
                <button
                  type="button" 
                  className={styles.confirm} 
                  onClick={
                    ()=>{exportAll()}
                  }>完成</button>
              </div>}
              <ExportToEmail visible={openEmail} defaultEmail={defaultEmail} confirm = {(email)=>{confirm(email)}} cancel={()=>{setOpenEmail(false)}} />
              {showPop ? (
                <MemberPop
                  source="批量导出"
                  type='join' show={showPop} 
                  onCancel={() => {
                    setShowPop(false)
                  }} />
              ) : null
              }
            </div>
          ) : null
        }
        <div className={styles.Settings}>
          {
            settingPage ? (
              <Settings urlKey={(urlRef.current ?? '') !=='' ? urlRef.current : urlType} onChangeFunc={changePageShow}/> 
            ) : null 
          }
        </div>
      </div>
      {/* {customerInter()} */}
      <Subscriptions onCallBack={onChangeGuide}/>
    </>
  )
}

const SubscriptionPage = () => {
  return (
    <KeepAlive>
      <SubscriptionPages/>
    </KeepAlive>
  )
}


export default React.memo(SubscriptionPage)