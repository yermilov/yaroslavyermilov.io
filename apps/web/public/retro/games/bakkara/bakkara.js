var pas = {};

var rtl = {

  version: 10501,

  quiet: false,
  debug_load_units: false,
  debug_rtti: false,

  $res : {},

  debug: function(){
    if (rtl.quiet || !console || !console.log) return;
    console.log(arguments);
  },

  error: function(s){
    rtl.debug('Error: ',s);
    throw s;
  },

  warn: function(s){
    rtl.debug('Warn: ',s);
  },

  checkVersion: function(v){
    if (rtl.version != v) throw "expected rtl version "+v+", but found "+rtl.version;
  },

  hiInt: Math.pow(2,53),

  hasString: function(s){
    return rtl.isString(s) && (s.length>0);
  },

  isArray: function(a) {
    return Array.isArray(a);
  },

  isFunction: function(f){
    return typeof(f)==="function";
  },

  isModule: function(m){
    return rtl.isObject(m) && rtl.hasString(m.$name) && (pas[m.$name]===m);
  },

  isImplementation: function(m){
    return rtl.isObject(m) && rtl.isModule(m.$module) && (m.$module.$impl===m);
  },

  isNumber: function(n){
    return typeof(n)==="number";
  },

  isObject: function(o){
    var s=typeof(o);
    return (typeof(o)==="object") && (o!=null);
  },

  isString: function(s){
    return typeof(s)==="string";
  },

  getNumber: function(n){
    return typeof(n)==="number"?n:NaN;
  },

  getChar: function(c){
    return ((typeof(c)==="string") && (c.length===1)) ? c : "";
  },

  getObject: function(o){
    return ((typeof(o)==="object") || (typeof(o)==='function')) ? o : null;
  },

  isTRecord: function(type){
    return (rtl.isObject(type) && type.hasOwnProperty('$new') && (typeof(type.$new)==='function'));
  },

  isPasClass: function(type){
    return (rtl.isObject(type) && type.hasOwnProperty('$classname') && rtl.isObject(type.$module));
  },

  isPasClassInstance: function(type){
    return (rtl.isObject(type) && rtl.isPasClass(type.$class));
  },

  hexStr: function(n,digits){
    return ("000000000000000"+n.toString(16).toUpperCase()).slice(-digits);
  },

  m_loading: 0,
  m_loading_intf: 1,
  m_intf_loaded: 2,
  m_loading_impl: 3, // loading all used unit
  m_initializing: 4, // running initialization
  m_initialized: 5,

  module: function(module_name, intfuseslist, intfcode, impluseslist, implcode){
    if (rtl.debug_load_units) rtl.debug('rtl.module name="'+module_name+'" intfuses='+intfuseslist+' impluses='+impluseslist+' hasimplcode='+rtl.isFunction(implcode));
    if (!rtl.hasString(module_name)) rtl.error('invalid module name "'+module_name+'"');
    if (!rtl.isArray(intfuseslist)) rtl.error('invalid interface useslist of "'+module_name+'"');
    if (!rtl.isFunction(intfcode)) rtl.error('invalid interface code of "'+module_name+'"');
    if (!(impluseslist==undefined) && !rtl.isArray(impluseslist)) rtl.error('invalid implementation useslist of "'+module_name+'"');
    if (!(implcode==undefined) && !rtl.isFunction(implcode)) rtl.error('invalid implementation code of "'+module_name+'"');

    if (pas[module_name])
      rtl.error('module "'+module_name+'" is already registered');

    var module = pas[module_name] = {
      $name: module_name,
      $intfuseslist: intfuseslist,
      $impluseslist: impluseslist,
      $state: rtl.m_loading,
      $intfcode: intfcode,
      $implcode: implcode,
      $impl: null,
      $rtti: Object.create(rtl.tSectionRTTI)
    };
    module.$rtti.$module = module;
    if (implcode) module.$impl = {
      $module: module,
      $rtti: module.$rtti
    };
  },

  exitcode: 0,

  run: function(module_name){
    try {
      if (!rtl.hasString(module_name)) module_name='program';
      if (rtl.debug_load_units) rtl.debug('rtl.run module="'+module_name+'"');
      rtl.initRTTI();
      var module = pas[module_name];
      if (!module) rtl.error('rtl.run module "'+module_name+'" missing');
      rtl.loadintf(module);
      rtl.loadimpl(module);
      if (module_name=='program'){
        if (rtl.debug_load_units) rtl.debug('running $main');
        var r = pas.program.$main();
        if (rtl.isNumber(r)) rtl.exitcode = r;
      }
    } catch(re) {
      if (!rtl.showUncaughtExceptions) {
        throw re
      } else {  
        if (!rtl.handleUncaughtException(re)) {
          rtl.showException(re);
          rtl.exitcode = 216;
        }  
      }
    } 
    return rtl.exitcode;
  },
  
  showException : function (re) {
    var errMsg = rtl.hasString(re.$classname) ? re.$classname : '';
    errMsg +=  ((errMsg) ? ': ' : '') + (re.hasOwnProperty('fMessage') ? re.fMessage : re);
    alert('Uncaught Exception : '+errMsg);
  },

  handleUncaughtException: function (e) {
    if (rtl.onUncaughtException) {
      try {
        rtl.onUncaughtException(e);
        return true;
      } catch (ee) {
        return false; 
      }
    } else {
      return false;
    }
  },

  loadintf: function(module){
    if (module.$state>rtl.m_loading_intf) return; // already finished
    if (rtl.debug_load_units) rtl.debug('loadintf: "'+module.$name+'"');
    if (module.$state===rtl.m_loading_intf)
      rtl.error('unit cycle detected "'+module.$name+'"');
    module.$state=rtl.m_loading_intf;
    // load interfaces of interface useslist
    rtl.loaduseslist(module,module.$intfuseslist,rtl.loadintf);
    // run interface
    if (rtl.debug_load_units) rtl.debug('loadintf: run intf of "'+module.$name+'"');
    module.$intfcode(module.$intfuseslist);
    // success
    module.$state=rtl.m_intf_loaded;
    // Note: units only used in implementations are not yet loaded (not even their interfaces)
  },

  loaduseslist: function(module,useslist,f){
    if (useslist==undefined) return;
    var len = useslist.length;
    for (var i = 0; i<len; i++) {
      var unitname=useslist[i];
      if (rtl.debug_load_units) rtl.debug('loaduseslist of "'+module.$name+'" uses="'+unitname+'"');
      if (pas[unitname]==undefined)
        rtl.error('module "'+module.$name+'" misses "'+unitname+'"');
      f(pas[unitname]);
    }
  },

  loadimpl: function(module){
    if (module.$state>=rtl.m_loading_impl) return; // already processing
    if (module.$state<rtl.m_intf_loaded) rtl.error('loadimpl: interface not loaded of "'+module.$name+'"');
    if (rtl.debug_load_units) rtl.debug('loadimpl: load uses of "'+module.$name+'"');
    module.$state=rtl.m_loading_impl;
    // load interfaces of implementation useslist
    rtl.loaduseslist(module,module.$impluseslist,rtl.loadintf);
    // load implementation of interfaces useslist
    rtl.loaduseslist(module,module.$intfuseslist,rtl.loadimpl);
    // load implementation of implementation useslist
    rtl.loaduseslist(module,module.$impluseslist,rtl.loadimpl);
    // Note: At this point all interfaces used by this unit are loaded. If
    //   there are implementation uses cycles some used units might not yet be
    //   initialized. This is by design.
    // run implementation
    if (rtl.debug_load_units) rtl.debug('loadimpl: run impl of "'+module.$name+'"');
    if (rtl.isFunction(module.$implcode)) module.$implcode(module.$impluseslist);
    // run initialization
    if (rtl.debug_load_units) rtl.debug('loadimpl: run init of "'+module.$name+'"');
    module.$state=rtl.m_initializing;
    if (rtl.isFunction(module.$init)) module.$init();
    // unit initialized
    module.$state=rtl.m_initialized;
  },

  createCallback: function(scope, fn){
    var cb;
    if (typeof(fn)==='string'){
      cb = function(){
        return scope[fn].apply(scope,arguments);
      };
    } else {
      cb = function(){
        return fn.apply(scope,arguments);
      };
    };
    cb.scope = scope;
    cb.fn = fn;
    return cb;
  },

  createSafeCallback: function(scope, fn){
    var cb = function(){
      try{
        if (typeof(fn)==='string'){
          return scope[fn].apply(scope,arguments);
        } else {
          return fn.apply(scope,arguments);
        };
      } catch (err) {
        if (!rtl.handleUncaughtException(err)) throw err;
      }
    };
    cb.scope = scope;
    cb.fn = fn;
    return cb;
  },

  cloneCallback: function(cb){
    return rtl.createCallback(cb.scope,cb.fn);
  },

  eqCallback: function(a,b){
    // can be a function or a function wrapper
    if (a==b){
      return true;
    } else {
      return (a!=null) && (b!=null) && (a.fn) && (a.scope===b.scope) && (a.fn==b.fn);
    }
  },

  initStruct: function(c,parent,name){
    if ((parent.$module) && (parent.$module.$impl===parent)) parent=parent.$module;
    c.$parent = parent;
    if (rtl.isModule(parent)){
      c.$module = parent;
      c.$name = name;
    } else {
      c.$module = parent.$module;
      c.$name = parent.$name+'.'+name;
    };
    return parent;
  },

  initClass: function(c,parent,name,initfn){
    parent[name] = c;
    c.$class = c; // Note: o.$class === Object.getPrototypeOf(o)
    c.$classname = name;
    parent = rtl.initStruct(c,parent,name);
    c.$fullname = parent.$name+'.'+name;
    // rtti
    if (rtl.debug_rtti) rtl.debug('initClass '+c.$fullname);
    var t = c.$module.$rtti.$Class(c.$name,{ "class": c });
    c.$rtti = t;
    if (rtl.isObject(c.$ancestor)) t.ancestor = c.$ancestor.$rtti;
    if (!t.ancestor) t.ancestor = null;
    // init members
    initfn.call(c);
  },

  createClass: function(parent,name,ancestor,initfn){
    // create a normal class,
    // ancestor must be null or a normal class,
    // the root ancestor can be an external class
    var c = null;
    if (ancestor != null){
      c = Object.create(ancestor);
      c.$ancestor = ancestor;
      // Note:
      // if root is an "object" then c.$ancestor === Object.getPrototypeOf(c)
      // if root is a "function" then c.$ancestor === c.__proto__, Object.getPrototypeOf(c) returns the root
    } else {
      c = { $ancestor: null };
      c.$create = function(fn,args){
        if (args == undefined) args = [];
        var o = Object.create(this);
        o.$init();
        try{
          if (typeof(fn)==="string"){
            o[fn].apply(o,args);
          } else {
            fn.apply(o,args);
          };
          o.AfterConstruction();
        } catch($e){
          // do not call BeforeDestruction
          if (o.Destroy) o.Destroy();
          o.$final();
          throw $e;
        }
        return o;
      };
      c.$destroy = function(fnname){
        this.BeforeDestruction();
        if (this[fnname]) this[fnname]();
        this.$final();
      };
    };
    rtl.initClass(c,parent,name,initfn);
  },

  createClassExt: function(parent,name,ancestor,newinstancefnname,initfn){
    // Create a class using an external ancestor.
    // If newinstancefnname is given, use that function to create the new object.
    // If exist call BeforeDestruction and AfterConstruction.
    var isFunc = rtl.isFunction(ancestor);
    var c = null;
    if (isFunc){
      // create pascal class descendent from JS function
      c = Object.create(ancestor.prototype);
    } else if (ancestor.$func){
      // create pascal class descendent from a pascal class descendent of a JS function
      isFunc = true;
      c = Object.create(ancestor);
      c.$ancestor = ancestor;
    } else {
      c = Object.create(ancestor);
    }
    c.$create = function(fn,args){
      if (args == undefined) args = [];
      var o = null;
      if (newinstancefnname.length>0){
        o = this[newinstancefnname](fn,args);
      } else if(isFunc) {
        o = new this.$func(args);
      } else {
        o = Object.create(c);
      }
      if (o.$init) o.$init();
      try{
        if (typeof(fn)==="string"){
          this[fn].apply(o,args);
        } else {
          fn.apply(o,args);
        };
        if (o.AfterConstruction) o.AfterConstruction();
      } catch($e){
        // do not call BeforeDestruction
        if (o.Destroy) o.Destroy();
        if (o.$final) o.$final();
        throw $e;
      }
      return o;
    };
    c.$destroy = function(fnname){
      if (this.BeforeDestruction) this.BeforeDestruction();
      if (this[fnname]) this[fnname]();
      if (this.$final) this.$final();
    };
    rtl.initClass(c,parent,name,initfn);
    if (isFunc){
      function f(){}
      f.prototype = c;
      c.$func = f;
      c.$ancestorfunc = ancestor;
    }
  },

  createHelper: function(parent,name,ancestor,initfn){
    // create a helper,
    // ancestor must be null or a helper,
    var c = null;
    if (ancestor != null){
      c = Object.create(ancestor);
      c.$ancestor = ancestor;
      // c.$ancestor === Object.getPrototypeOf(c)
    } else {
      c = { $ancestor: null };
    };
    parent[name] = c;
    c.$class = c; // Note: o.$class === Object.getPrototypeOf(o)
    c.$classname = name;
    parent = rtl.initStruct(c,parent,name);
    c.$fullname = parent.$name+'.'+name;
    // rtti
    var t = c.$module.$rtti.$Helper(c.$name,{ "helper": c });
    c.$rtti = t;
    if (rtl.isObject(ancestor)) t.ancestor = ancestor.$rtti;
    if (!t.ancestor) t.ancestor = null;
    // init members
    initfn.call(c);
  },

  tObjectDestroy: "Destroy",

  free: function(obj,name){
    if (obj[name]==null) return null;
    obj[name].$destroy(rtl.tObjectDestroy);
    obj[name]=null;
  },

  freeLoc: function(obj){
    if (obj==null) return null;
    obj.$destroy(rtl.tObjectDestroy);
    return null;
  },

  hideProp: function(o,p,v){
    Object.defineProperty(o,p, {
      enumerable: false,
      configurable: true,
      writable: true
    });
    if(arguments.length>2){ o[p]=v; }
  },

  recNewT: function(parent,name,initfn,full){
    // create new record type
    var t = {};
    if (parent) parent[name] = t;
    var h = rtl.hideProp;
    if (full){
      rtl.initStruct(t,parent,name);
      t.$record = t;
      h(t,'$record');
      h(t,'$name');
      h(t,'$parent');
      h(t,'$module');
    }
    initfn.call(t);
    if (!t.$new){
      t.$new = function(){ return Object.create(t); };
    }
    t.$clone = function(r){ return t.$new().$assign(r); };
    h(t,'$new');
    h(t,'$clone');
    h(t,'$eq');
    h(t,'$assign');
    return t;
  },

  is: function(instance,type){
    return type.isPrototypeOf(instance) || (instance===type);
  },

  isExt: function(instance,type,mode){
    // mode===1 means instance must be a Pascal class instance
    // mode===2 means instance must be a Pascal class
    // Notes:
    // isPrototypeOf and instanceof return false on equal
    // isPrototypeOf does not work for Date.isPrototypeOf(new Date())
    //   so if isPrototypeOf is false test with instanceof
    // instanceof needs a function on right side
    if (instance == null) return false; // Note: ==null checks for undefined too
    if ((typeof(type) !== 'object') && (typeof(type) !== 'function')) return false;
    if (instance === type){
      if (mode===1) return false;
      if (mode===2) return rtl.isPasClass(instance);
      return true;
    }
    if (type.isPrototypeOf && type.isPrototypeOf(instance)){
      if (mode===1) return rtl.isPasClassInstance(instance);
      if (mode===2) return rtl.isPasClass(instance);
      return true;
    }
    if ((typeof type == 'function') && (instance instanceof type)) return true;
    return false;
  },

  Exception: null,
  EInvalidCast: null,
  EAbstractError: null,
  ERangeError: null,
  EIntOverflow: null,
  EPropWriteOnly: null,

  raiseE: function(typename){
    var t = rtl[typename];
    if (t==null){
      var mod = pas.SysUtils;
      if (!mod) mod = pas.sysutils;
      if (mod){
        t = mod[typename];
        if (!t) t = mod[typename.toLowerCase()];
        if (!t) t = mod['Exception'];
        if (!t) t = mod['exception'];
      }
    }
    if (t){
      if (t.Create){
        throw t.$create("Create");
      } else if (t.create){
        throw t.$create("create");
      }
    }
    if (typename === "EInvalidCast") throw "invalid type cast";
    if (typename === "EAbstractError") throw "Abstract method called";
    if (typename === "ERangeError") throw "range error";
    throw typename;
  },

  as: function(instance,type){
    if((instance === null) || rtl.is(instance,type)) return instance;
    rtl.raiseE("EInvalidCast");
  },

  asExt: function(instance,type,mode){
    if((instance === null) || rtl.isExt(instance,type,mode)) return instance;
    rtl.raiseE("EInvalidCast");
  },

  createInterface: function(module, name, guid, fnnames, ancestor, initfn){
    //console.log('createInterface name="'+name+'" guid="'+guid+'" names='+fnnames);
    var i = ancestor?Object.create(ancestor):{};
    module[name] = i;
    i.$module = module;
    i.$name = name;
    i.$fullname = module.$name+'.'+name;
    i.$guid = guid;
    i.$guidr = null;
    i.$names = fnnames?fnnames:[];
    if (rtl.isFunction(initfn)){
      // rtti
      if (rtl.debug_rtti) rtl.debug('createInterface '+i.$fullname);
      var t = i.$module.$rtti.$Interface(name,{ "interface": i, module: module });
      i.$rtti = t;
      if (ancestor) t.ancestor = ancestor.$rtti;
      if (!t.ancestor) t.ancestor = null;
      initfn.call(i);
    }
    return i;
  },

  strToGUIDR: function(s,g){
    var p = 0;
    function n(l){
      var h = s.substr(p,l);
      p+=l;
      return parseInt(h,16);
    }
    p+=1; // skip {
    g.D1 = n(8);
    p+=1; // skip -
    g.D2 = n(4);
    p+=1; // skip -
    g.D3 = n(4);
    p+=1; // skip -
    if (!g.D4) g.D4=[];
    g.D4[0] = n(2);
    g.D4[1] = n(2);
    p+=1; // skip -
    for(var i=2; i<8; i++) g.D4[i] = n(2);
    return g;
  },

  guidrToStr: function(g){
    if (g.$intf) return g.$intf.$guid;
    var h = rtl.hexStr;
    var s='{'+h(g.D1,8)+'-'+h(g.D2,4)+'-'+h(g.D3,4)+'-'+h(g.D4[0],2)+h(g.D4[1],2)+'-';
    for (var i=2; i<8; i++) s+=h(g.D4[i],2);
    s+='}';
    return s;
  },

  createTGUID: function(guid){
    var TGuid = (pas.System)?pas.System.TGuid:pas.system.tguid;
    var g = rtl.strToGUIDR(guid,TGuid.$new());
    return g;
  },

  getIntfGUIDR: function(intfTypeOrVar){
    if (!intfTypeOrVar) return null;
    if (!intfTypeOrVar.$guidr){
      var g = rtl.createTGUID(intfTypeOrVar.$guid);
      if (!intfTypeOrVar.hasOwnProperty('$guid')) intfTypeOrVar = Object.getPrototypeOf(intfTypeOrVar);
      g.$intf = intfTypeOrVar;
      intfTypeOrVar.$guidr = g;
    }
    return intfTypeOrVar.$guidr;
  },

  addIntf: function (aclass, intf, map){
    function jmp(fn){
      if (typeof(fn)==="function"){
        return function(){ return fn.apply(this.$o,arguments); };
      } else {
        return function(){ rtl.raiseE('EAbstractError'); };
      }
    }
    if(!map) map = {};
    var t = intf;
    var item = Object.create(t);
    if (!aclass.hasOwnProperty('$intfmaps')) aclass.$intfmaps = {};
    aclass.$intfmaps[intf.$guid] = item;
    do{
      var names = t.$names;
      if (!names) break;
      for (var i=0; i<names.length; i++){
        var intfname = names[i];
        var fnname = map[intfname];
        if (!fnname) fnname = intfname;
        //console.log('addIntf: intftype='+t.$name+' index='+i+' intfname="'+intfname+'" fnname="'+fnname+'" old='+typeof(item[intfname]));
        item[intfname] = jmp(aclass[fnname]);
      }
      t = Object.getPrototypeOf(t);
    }while(t!=null);
  },

  getIntfG: function (obj, guid, query){
    if (!obj) return null;
    //console.log('getIntfG: obj='+obj.$classname+' guid='+guid+' query='+query);
    // search
    var maps = obj.$intfmaps;
    if (!maps) return null;
    var item = maps[guid];
    if (!item) return null;
    // check delegation
    //console.log('getIntfG: obj='+obj.$classname+' guid='+guid+' query='+query+' item='+typeof(item));
    if (typeof item === 'function') return item.call(obj); // delegate. Note: COM contains _AddRef
    // check cache
    var intf = null;
    if (obj.$interfaces){
      intf = obj.$interfaces[guid];
      //console.log('getIntfG: obj='+obj.$classname+' guid='+guid+' cache='+typeof(intf));
    }
    if (!intf){ // intf can be undefined!
      intf = Object.create(item);
      intf.$o = obj;
      if (!obj.$interfaces) obj.$interfaces = {};
      obj.$interfaces[guid] = intf;
    }
    if (typeof(query)==='object'){
      // called by queryIntfT
      var o = null;
      if (intf.QueryInterface(rtl.getIntfGUIDR(query),
          {get:function(){ return o; }, set:function(v){ o=v; }}) === 0){
        return o;
      } else {
        return null;
      }
    } else if(query===2){
      // called by TObject.GetInterfaceByStr
      if (intf.$kind === 'com') intf._AddRef();
    }
    return intf;
  },

  getIntfT: function(obj,intftype){
    return rtl.getIntfG(obj,intftype.$guid);
  },

  queryIntfT: function(obj,intftype){
    return rtl.getIntfG(obj,intftype.$guid,intftype);
  },

  queryIntfIsT: function(obj,intftype){
    var i = rtl.getIntfG(obj,intftype.$guid);
    if (!i) return false;
    if (i.$kind === 'com') i._Release();
    return true;
  },

  asIntfT: function (obj,intftype){
    var i = rtl.getIntfG(obj,intftype.$guid);
    if (i!==null) return i;
    rtl.raiseEInvalidCast();
  },

  intfIsIntfT: function(intf,intftype){
    return (intf!==null) && rtl.queryIntfIsT(intf.$o,intftype);
  },

  intfAsIntfT: function (intf,intftype){
    if (intf){
      var i = rtl.getIntfG(intf.$o,intftype.$guid);
      if (i!==null) return i;
    }
    rtl.raiseEInvalidCast();
  },

  intfIsClass: function(intf,classtype){
    return (intf!=null) && (rtl.is(intf.$o,classtype));
  },

  intfAsClass: function(intf,classtype){
    if (intf==null) return null;
    return rtl.as(intf.$o,classtype);
  },

  intfToClass: function(intf,classtype){
    if ((intf!==null) && rtl.is(intf.$o,classtype)) return intf.$o;
    return null;
  },

  // interface reference counting
  intfRefs: { // base object for temporary interface variables
    ref: function(id,intf){
      // called for temporary interface references needing delayed release
      var old = this[id];
      //console.log('rtl.intfRefs.ref: id='+id+' old="'+(old?old.$name:'null')+'" intf="'+(intf?intf.$name:'null')+' $o='+(intf?intf.$o:'null'));
      if (old){
        // called again, e.g. in a loop
        delete this[id];
        old._Release(); // may fail
      }
      this[id]=intf;
      return intf;
    },
    free: function(){
      //console.log('rtl.intfRefs.free...');
      for (var id in this){
        if (this.hasOwnProperty(id)){
          //console.log('rtl.intfRefs.free: id='+id+' '+this[id].$name+' $o='+this[id].$o.$classname);
          this[id]._Release();
        }
      }
    }
  },

  createIntfRefs: function(){
    //console.log('rtl.createIntfRefs');
    return Object.create(rtl.intfRefs);
  },

  setIntfP: function(path,name,value,skipAddRef){
    var old = path[name];
    //console.log('rtl.setIntfP path='+path+' name='+name+' old="'+(old?old.$name:'null')+'" value="'+(value?value.$name:'null')+'"');
    if (old === value) return;
    if (old !== null){
      path[name]=null;
      old._Release();
    }
    if (value !== null){
      if (!skipAddRef) value._AddRef();
      path[name]=value;
    }
  },

  setIntfL: function(old,value,skipAddRef){
    //console.log('rtl.setIntfL old="'+(old?old.$name:'null')+'" value="'+(value?value.$name:'null')+'"');
    if (old !== value){
      if (value!==null){
        if (!skipAddRef) value._AddRef();
      }
      if (old!==null){
        old._Release();  // Release after AddRef, to avoid double Release if Release creates an exception
      }
    } else if (skipAddRef){
      if (old!==null){
        old._Release();  // value has an AddRef
      }
    }
    return value;
  },

  _AddRef: function(intf){
    //if (intf) console.log('rtl._AddRef intf="'+(intf?intf.$name:'null')+'"');
    if (intf) intf._AddRef();
    return intf;
  },

  _Release: function(intf){
    //if (intf) console.log('rtl._Release intf="'+(intf?intf.$name:'null')+'"');
    if (intf) intf._Release();
    return intf;
  },

  checkMethodCall: function(obj,type){
    if (rtl.isObject(obj) && rtl.is(obj,type)) return;
    rtl.raiseE("EInvalidCast");
  },

  oc: function(i){
    // overflow check integer
    if ((Math.floor(i)===i) && (i>=-0x1fffffffffffff) && (i<=0x1fffffffffffff)) return i;
    rtl.raiseE('EIntOverflow');
  },

  rc: function(i,minval,maxval){
    // range check integer
    if ((Math.floor(i)===i) && (i>=minval) && (i<=maxval)) return i;
    rtl.raiseE('ERangeError');
  },

  rcc: function(c,minval,maxval){
    // range check char
    if ((typeof(c)==='string') && (c.length===1)){
      var i = c.charCodeAt(0);
      if ((i>=minval) && (i<=maxval)) return c;
    }
    rtl.raiseE('ERangeError');
  },

  rcSetCharAt: function(s,index,c){
    // range check setCharAt
    if ((typeof(s)!=='string') || (index<0) || (index>=s.length)) rtl.raiseE('ERangeError');
    return rtl.setCharAt(s,index,c);
  },

  rcCharAt: function(s,index){
    // range check charAt
    if ((typeof(s)!=='string') || (index<0) || (index>=s.length)) rtl.raiseE('ERangeError');
    return s.charAt(index);
  },

  rcArrR: function(arr,index){
    // range check read array
    if (Array.isArray(arr) && (typeof(index)==='number') && (index>=0) && (index<arr.length)){
      if (arguments.length>2){
        // arr,index1,index2,...
        arr=arr[index];
        for (var i=2; i<arguments.length; i++) arr=rtl.rcArrR(arr,arguments[i]);
        return arr;
      }
      return arr[index];
    }
    rtl.raiseE('ERangeError');
  },

  rcArrW: function(arr,index,value){
    // range check write array
    // arr,index1,index2,...,value
    for (var i=3; i<arguments.length; i++){
      arr=rtl.rcArrR(arr,index);
      index=arguments[i-1];
      value=arguments[i];
    }
    if (Array.isArray(arr) && (typeof(index)==='number') && (index>=0) && (index<arr.length)){
      return arr[index]=value;
    }
    rtl.raiseE('ERangeError');
  },

  length: function(arr){
    return (arr == null) ? 0 : arr.length;
  },

  arrayRef: function(a){
    if (a!=null) rtl.hideProp(a,'$pas2jsrefcnt',1);
    return a;
  },

  arraySetLength: function(arr,defaultvalue,newlength){
    var stack = [];
    var s = 9999;
    for (var i=2; i<arguments.length; i++){
      var j = arguments[i];
      if (j==='s'){ s = i-2; }
      else {
        stack.push({ dim:j+0, a:null, i:0, src:null });
      }
    }
    var dimmax = stack.length-1;
    var depth = 0;
    var lastlen = 0;
    var item = null;
    var a = null;
    var src = arr;
    var srclen = 0, oldlen = 0;
    do{
      if (depth>0){
        item=stack[depth-1];
        src = (item.src && item.src.length>item.i)?item.src[item.i]:null;
      }
      if (!src){
        a = [];
        srclen = 0;
        oldlen = 0;
      } else if (src.$pas2jsrefcnt>0 || depth>=s){
        a = [];
        srclen = src.length;
        oldlen = srclen;
      } else {
        a = src;
        srclen = 0;
        oldlen = a.length;
      }
      lastlen = stack[depth].dim;
      a.length = lastlen;
      if (depth>0){
        item.a[item.i]=a;
        item.i++;
        if ((lastlen===0) && (item.i<item.a.length)) continue;
      }
      if (lastlen>0){
        if (depth<dimmax){
          item = stack[depth];
          item.a = a;
          item.i = 0;
          item.src = src;
          depth++;
          continue;
        } else {
          if (srclen>lastlen) srclen=lastlen;
          if (rtl.isArray(defaultvalue)){
            // array of dyn array
            for (var i=0; i<srclen; i++) a[i]=src[i];
            for (var i=oldlen; i<lastlen; i++) a[i]=[];
          } else if (rtl.isObject(defaultvalue)) {
            if (rtl.isTRecord(defaultvalue)){
              // array of record
              for (var i=0; i<srclen; i++) a[i]=defaultvalue.$clone(src[i]);
              for (var i=oldlen; i<lastlen; i++) a[i]=defaultvalue.$new();
            } else {
              // array of set
              for (var i=0; i<srclen; i++) a[i]=rtl.refSet(src[i]);
              for (var i=oldlen; i<lastlen; i++) a[i]={};
            }
          } else {
            for (var i=0; i<srclen; i++) a[i]=src[i];
            for (var i=oldlen; i<lastlen; i++) a[i]=defaultvalue;
          }
        }
      }
      // backtrack
      while ((depth>0) && (stack[depth-1].i>=stack[depth-1].dim)){
        depth--;
      };
      if (depth===0){
        if (dimmax===0) return a;
        return stack[0].a;
      }
    }while (true);
  },

  arrayEq: function(a,b){
    if (a===null) return b===null;
    if (b===null) return false;
    if (a.length!==b.length) return false;
    for (var i=0; i<a.length; i++) if (a[i]!==b[i]) return false;
    return true;
  },

  arrayClone: function(type,src,srcpos,endpos,dst,dstpos){
    // type: 0 for references, "refset" for calling refSet(), a function for new type()
    // src must not be null
    // This function does not range check.
    if(type === 'refSet') {
      for (; srcpos<endpos; srcpos++) dst[dstpos++] = rtl.refSet(src[srcpos]); // ref set
    } else if (rtl.isTRecord(type)){
      for (; srcpos<endpos; srcpos++) dst[dstpos++] = type.$clone(src[srcpos]); // clone record
    }  else {
      for (; srcpos<endpos; srcpos++) dst[dstpos++] = src[srcpos]; // reference
    };
  },

  arrayConcat: function(type){
    // type: see rtl.arrayClone
    var a = [];
    var l = 0;
    for (var i=1; i<arguments.length; i++){
      var src = arguments[i];
      if (src !== null) l+=src.length;
    };
    a.length = l;
    l=0;
    for (var i=1; i<arguments.length; i++){
      var src = arguments[i];
      if (src === null) continue;
      rtl.arrayClone(type,src,0,src.length,a,l);
      l+=src.length;
    };
    return a;
  },

  arrayConcatN: function(){
    var a = null;
    for (var i=1; i<arguments.length; i++){
      var src = arguments[i];
      if (src === null) continue;
      if (a===null){
        a=src; // Note: concat(a) does not clone
      } else {
        a=a.concat(src);
      }
    };
    return a;
  },

  arrayCopy: function(type, srcarray, index, count){
    // type: see rtl.arrayClone
    // if count is missing, use srcarray.length
    if (srcarray === null) return [];
    if (index < 0) index = 0;
    if (count === undefined) count=srcarray.length;
    var end = index+count;
    if (end>srcarray.length) end = srcarray.length;
    if (index>=end) return [];
    if (type===0){
      return srcarray.slice(index,end);
    } else {
      var a = [];
      a.length = end-index;
      rtl.arrayClone(type,srcarray,index,end,a,0);
      return a;
    }
  },

  setCharAt: function(s,index,c){
    return s.substr(0,index)+c+s.substr(index+1);
  },

  getResStr: function(mod,name){
    var rs = mod.$resourcestrings[name];
    return rs.current?rs.current:rs.org;
  },

  createSet: function(){
    var s = {};
    for (var i=0; i<arguments.length; i++){
      if (arguments[i]!=null){
        s[arguments[i]]=true;
      } else {
        var first=arguments[i+=1];
        var last=arguments[i+=1];
        for(var j=first; j<=last; j++) s[j]=true;
      }
    }
    return s;
  },

  cloneSet: function(s){
    var r = {};
    for (var key in s) r[key]=true;
    return r;
  },

  refSet: function(s){
    rtl.hideProp(s,'$shared',true);
    return s;
  },

  includeSet: function(s,enumvalue){
    if (s.$shared) s = rtl.cloneSet(s);
    s[enumvalue] = true;
    return s;
  },

  excludeSet: function(s,enumvalue){
    if (s.$shared) s = rtl.cloneSet(s);
    delete s[enumvalue];
    return s;
  },

  diffSet: function(s,t){
    var r = {};
    for (var key in s) if (!t[key]) r[key]=true;
    return r;
  },

  unionSet: function(s,t){
    var r = {};
    for (var key in s) r[key]=true;
    for (var key in t) r[key]=true;
    return r;
  },

  intersectSet: function(s,t){
    var r = {};
    for (var key in s) if (t[key]) r[key]=true;
    return r;
  },

  symDiffSet: function(s,t){
    var r = {};
    for (var key in s) if (!t[key]) r[key]=true;
    for (var key in t) if (!s[key]) r[key]=true;
    return r;
  },

  eqSet: function(s,t){
    for (var key in s) if (!t[key]) return false;
    for (var key in t) if (!s[key]) return false;
    return true;
  },

  neSet: function(s,t){
    return !rtl.eqSet(s,t);
  },

  leSet: function(s,t){
    for (var key in s) if (!t[key]) return false;
    return true;
  },

  geSet: function(s,t){
    for (var key in t) if (!s[key]) return false;
    return true;
  },

  strSetLength: function(s,newlen){
    var oldlen = s.length;
    if (oldlen > newlen){
      return s.substring(0,newlen);
    } else if (s.repeat){
      // Note: repeat needs ECMAScript6!
      return s+' '.repeat(newlen-oldlen);
    } else {
       while (oldlen<newlen){
         s+=' ';
         oldlen++;
       };
       return s;
    }
  },

  spaceLeft: function(s,width){
    var l=s.length;
    if (l>=width) return s;
    if (s.repeat){
      // Note: repeat needs ECMAScript6!
      return ' '.repeat(width-l) + s;
    } else {
      while (l<width){
        s=' '+s;
        l++;
      };
      return s;
    };
  },

  floatToStr: function(d,w,p){
    // input 1-3 arguments: double, width, precision
    if (arguments.length>2){
      return rtl.spaceLeft(d.toFixed(p),w);
    } else {
	  // exponent width
	  var pad = "";
	  var ad = Math.abs(d);
	  if (ad<1.0e+10) {
		pad='00';
	  } else if (ad<1.0e+100) {
		pad='0';
      }  	
	  if (arguments.length<2) {
	    w=9;		
      } else if (w<9) {
		w=9;
      }		  
      var p = w-8;
      var s=(d>0 ? " " : "" ) + d.toExponential(p);
      s=s.replace(/e(.)/,'E$1'+pad);
      return rtl.spaceLeft(s,w);
    }
  },

  valEnum: function(s, enumType, setCodeFn){
    s = s.toLowerCase();
    for (var key in enumType){
      if((typeof(key)==='string') && (key.toLowerCase()===s)){
        setCodeFn(0);
        return enumType[key];
      }
    }
    setCodeFn(1);
    return 0;
  },

  lw: function(l){
    // fix longword bitwise operation
    return l<0?l+0x100000000:l;
  },

  and: function(a,b){
    var hi = 0x80000000;
    var low = 0x7fffffff;
    var h = (a / hi) & (b / hi);
    var l = (a & low) & (b & low);
    return h*hi + l;
  },

  or: function(a,b){
    var hi = 0x80000000;
    var low = 0x7fffffff;
    var h = (a / hi) | (b / hi);
    var l = (a & low) | (b & low);
    return h*hi + l;
  },

  xor: function(a,b){
    var hi = 0x80000000;
    var low = 0x7fffffff;
    var h = (a / hi) ^ (b / hi);
    var l = (a & low) ^ (b & low);
    return h*hi + l;
  },

  shr: function(a,b){
    if (a<0) a += rtl.hiInt;
    if (a<0x80000000) return a >> b;
    if (b<=0) return a;
    if (b>54) return 0;
    return Math.floor(a / Math.pow(2,b));
  },

  shl: function(a,b){
    if (a<0) a += rtl.hiInt;
    if (b<=0) return a;
    if (b>54) return 0;
    var r = a * Math.pow(2,b);
    if (r <= rtl.hiInt) return r;
    return r % rtl.hiInt;
  },

  initRTTI: function(){
    if (rtl.debug_rtti) rtl.debug('initRTTI');

    // base types
    rtl.tTypeInfo = { name: "tTypeInfo" };
    function newBaseTI(name,kind,ancestor){
      if (!ancestor) ancestor = rtl.tTypeInfo;
      if (rtl.debug_rtti) rtl.debug('initRTTI.newBaseTI "'+name+'" '+kind+' ("'+ancestor.name+'")');
      var t = Object.create(ancestor);
      t.name = name;
      t.kind = kind;
      rtl[name] = t;
      return t;
    };
    function newBaseInt(name,minvalue,maxvalue,ordtype){
      var t = newBaseTI(name,1 /* tkInteger */,rtl.tTypeInfoInteger);
      t.minvalue = minvalue;
      t.maxvalue = maxvalue;
      t.ordtype = ordtype;
      return t;
    };
    newBaseTI("tTypeInfoInteger",1 /* tkInteger */);
    newBaseInt("shortint",-0x80,0x7f,0);
    newBaseInt("byte",0,0xff,1);
    newBaseInt("smallint",-0x8000,0x7fff,2);
    newBaseInt("word",0,0xffff,3);
    newBaseInt("longint",-0x80000000,0x7fffffff,4);
    newBaseInt("longword",0,0xffffffff,5);
    newBaseInt("nativeint",-0x10000000000000,0xfffffffffffff,6);
    newBaseInt("nativeuint",0,0xfffffffffffff,7);
    newBaseTI("char",2 /* tkChar */);
    newBaseTI("string",3 /* tkString */);
    newBaseTI("tTypeInfoEnum",4 /* tkEnumeration */,rtl.tTypeInfoInteger);
    newBaseTI("tTypeInfoSet",5 /* tkSet */);
    newBaseTI("double",6 /* tkDouble */);
    newBaseTI("boolean",7 /* tkBool */);
    newBaseTI("tTypeInfoProcVar",8 /* tkProcVar */);
    newBaseTI("tTypeInfoMethodVar",9 /* tkMethod */,rtl.tTypeInfoProcVar);
    newBaseTI("tTypeInfoArray",10 /* tkArray */);
    newBaseTI("tTypeInfoDynArray",11 /* tkDynArray */);
    newBaseTI("tTypeInfoPointer",15 /* tkPointer */);
    var t = newBaseTI("pointer",15 /* tkPointer */,rtl.tTypeInfoPointer);
    t.reftype = null;
    newBaseTI("jsvalue",16 /* tkJSValue */);
    newBaseTI("tTypeInfoRefToProcVar",17 /* tkRefToProcVar */,rtl.tTypeInfoProcVar);

    // member kinds
    rtl.tTypeMember = {};
    function newMember(name,kind){
      var m = Object.create(rtl.tTypeMember);
      m.name = name;
      m.kind = kind;
      rtl[name] = m;
    };
    newMember("tTypeMemberField",1); // tmkField
    newMember("tTypeMemberMethod",2); // tmkMethod
    newMember("tTypeMemberProperty",3); // tmkProperty

    // base object for storing members: a simple object
    rtl.tTypeMembers = {};

    // tTypeInfoStruct - base object for tTypeInfoClass, tTypeInfoRecord, tTypeInfoInterface
    var tis = newBaseTI("tTypeInfoStruct",0);
    tis.$addMember = function(name,ancestor,options){
      if (rtl.debug_rtti){
        if (!rtl.hasString(name) || (name.charAt()==='$')) throw 'invalid member "'+name+'", this="'+this.name+'"';
        if (!rtl.is(ancestor,rtl.tTypeMember)) throw 'invalid ancestor "'+ancestor+':'+ancestor.name+'", "'+this.name+'.'+name+'"';
        if ((options!=undefined) && (typeof(options)!='object')) throw 'invalid options "'+options+'", "'+this.name+'.'+name+'"';
      };
      var t = Object.create(ancestor);
      t.name = name;
      this.members[name] = t;
      this.names.push(name);
      if (rtl.isObject(options)){
        for (var key in options) if (options.hasOwnProperty(key)) t[key] = options[key];
      };
      return t;
    };
    tis.addField = function(name,type,options){
      var t = this.$addMember(name,rtl.tTypeMemberField,options);
      if (rtl.debug_rtti){
        if (!rtl.is(type,rtl.tTypeInfo)) throw 'invalid type "'+type+'", "'+this.name+'.'+name+'"';
      };
      t.typeinfo = type;
      this.fields.push(name);
      return t;
    };
    tis.addFields = function(){
      var i=0;
      while(i<arguments.length){
        var name = arguments[i++];
        var type = arguments[i++];
        if ((i<arguments.length) && (typeof(arguments[i])==='object')){
          this.addField(name,type,arguments[i++]);
        } else {
          this.addField(name,type);
        };
      };
    };
    tis.addMethod = function(name,methodkind,params,result,options){
      var t = this.$addMember(name,rtl.tTypeMemberMethod,options);
      t.methodkind = methodkind;
      t.procsig = rtl.newTIProcSig(params);
      t.procsig.resulttype = result?result:null;
      this.methods.push(name);
      return t;
    };
    tis.addProperty = function(name,flags,result,getter,setter,options){
      var t = this.$addMember(name,rtl.tTypeMemberProperty,options);
      t.flags = flags;
      t.typeinfo = result;
      t.getter = getter;
      t.setter = setter;
      // Note: in options: params, stored, defaultvalue
      if (rtl.isArray(t.params)) t.params = rtl.newTIParams(t.params);
      this.properties.push(name);
      if (!rtl.isString(t.stored)) t.stored = "";
      return t;
    };
    tis.getField = function(index){
      return this.members[this.fields[index]];
    };
    tis.getMethod = function(index){
      return this.members[this.methods[index]];
    };
    tis.getProperty = function(index){
      return this.members[this.properties[index]];
    };

    newBaseTI("tTypeInfoRecord",12 /* tkRecord */,rtl.tTypeInfoStruct);
    newBaseTI("tTypeInfoClass",13 /* tkClass */,rtl.tTypeInfoStruct);
    newBaseTI("tTypeInfoClassRef",14 /* tkClassRef */);
    newBaseTI("tTypeInfoInterface",18 /* tkInterface */,rtl.tTypeInfoStruct);
    newBaseTI("tTypeInfoHelper",19 /* tkHelper */,rtl.tTypeInfoStruct);
    newBaseTI("tTypeInfoExtClass",20 /* tkExtClass */,rtl.tTypeInfoClass);
  },

  tSectionRTTI: {
    $module: null,
    $inherited: function(name,ancestor,o){
      if (rtl.debug_rtti){
        rtl.debug('tSectionRTTI.newTI "'+(this.$module?this.$module.$name:"(no module)")
          +'"."'+name+'" ('+ancestor.name+') '+(o?'init':'forward'));
      };
      var t = this[name];
      if (t){
        if (!t.$forward) throw 'duplicate type "'+name+'"';
        if (!ancestor.isPrototypeOf(t)) throw 'typeinfo ancestor mismatch "'+name+'" ancestor="'+ancestor.name+'" t.name="'+t.name+'"';
      } else {
        t = Object.create(ancestor);
        t.name = name;
        t.$module = this.$module;
        this[name] = t;
      }
      if (o){
        delete t.$forward;
        for (var key in o) if (o.hasOwnProperty(key)) t[key]=o[key];
      } else {
        t.$forward = true;
      }
      return t;
    },
    $Scope: function(name,ancestor,o){
      var t=this.$inherited(name,ancestor,o);
      t.members = {};
      t.names = [];
      t.fields = [];
      t.methods = [];
      t.properties = [];
      return t;
    },
    $TI: function(name,kind,o){ var t=this.$inherited(name,rtl.tTypeInfo,o); t.kind = kind; return t; },
    $Int: function(name,o){ return this.$inherited(name,rtl.tTypeInfoInteger,o); },
    $Enum: function(name,o){ return this.$inherited(name,rtl.tTypeInfoEnum,o); },
    $Set: function(name,o){ return this.$inherited(name,rtl.tTypeInfoSet,o); },
    $StaticArray: function(name,o){ return this.$inherited(name,rtl.tTypeInfoArray,o); },
    $DynArray: function(name,o){ return this.$inherited(name,rtl.tTypeInfoDynArray,o); },
    $ProcVar: function(name,o){ return this.$inherited(name,rtl.tTypeInfoProcVar,o); },
    $RefToProcVar: function(name,o){ return this.$inherited(name,rtl.tTypeInfoRefToProcVar,o); },
    $MethodVar: function(name,o){ return this.$inherited(name,rtl.tTypeInfoMethodVar,o); },
    $Record: function(name,o){ return this.$Scope(name,rtl.tTypeInfoRecord,o); },
    $Class: function(name,o){ return this.$Scope(name,rtl.tTypeInfoClass,o); },
    $ClassRef: function(name,o){ return this.$inherited(name,rtl.tTypeInfoClassRef,o); },
    $Pointer: function(name,o){ return this.$inherited(name,rtl.tTypeInfoPointer,o); },
    $Interface: function(name,o){ return this.$Scope(name,rtl.tTypeInfoInterface,o); },
    $Helper: function(name,o){ return this.$Scope(name,rtl.tTypeInfoHelper,o); },
    $ExtClass: function(name,o){ return this.$Scope(name,rtl.tTypeInfoExtClass,o); }
  },

  newTIParam: function(param){
    // param is an array, 0=name, 1=type, 2=optional flags
    var t = {
      name: param[0],
      typeinfo: param[1],
      flags: (rtl.isNumber(param[2]) ? param[2] : 0)
    };
    return t;
  },

  newTIParams: function(list){
    // list: optional array of [paramname,typeinfo,optional flags]
    var params = [];
    if (rtl.isArray(list)){
      for (var i=0; i<list.length; i++) params.push(rtl.newTIParam(list[i]));
    };
    return params;
  },

  newTIProcSig: function(params,result,flags){
    var s = {
      params: rtl.newTIParams(params),
      resulttype: result,
      flags: flags
    };
    return s;
  },

  addResource: function(aRes){
    rtl.$res[aRes.name]=aRes;
  },

  getResource: function(aName){
    var res = rtl.$res[aName];
    if (res !== undefined) {
      return res;
    } else {
      return null;
    }
  },

  getResourceList: function(){
    return Object.keys(rtl.$res);
  }
}

rtl.module("System",[],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  this.Random = function (Range) {
    return Math.floor(Math.random()*Range);
  };
  this.Trunc = function (A) {
    if (!Math.trunc) {
      Math.trunc = function(v) {
        v = +v;
        if (!isFinite(v)) return v;
        return (v - v % 1) || (v < 0 ? -0 : v === 0 ? v : 0);
      };
    }
    $mod.Trunc = Math.trunc;
    return Math.trunc(A);
  };
  this.Copy = function (S, Index, Size) {
    if (Index<1) Index = 1;
    return (Size>0) ? S.substring(Index-1,Index+Size-1) : "";
  };
  this.Write = function () {
    var i = 0;
    for (var $l = 0, $end = arguments.length - 1; $l <= $end; $l++) {
      i = $l;
      if ($impl.WriteCallBack != null) {
        $impl.WriteCallBack(arguments[i],false)}
       else $impl.WriteBuf = $impl.WriteBuf + ("" + arguments[i]);
    };
  };
  this.Writeln = function () {
    var i = 0;
    var l = 0;
    var s = "";
    l = arguments.length - 1;
    if ($impl.WriteCallBack != null) {
      for (var $l = 0, $end = l; $l <= $end; $l++) {
        i = $l;
        $impl.WriteCallBack(arguments[i],i === l);
      };
    } else {
      s = $impl.WriteBuf;
      for (var $l1 = 0, $end1 = l; $l1 <= $end1; $l1++) {
        i = $l1;
        s = s + ("" + arguments[i]);
      };
      console.log(s);
      $impl.WriteBuf = "";
    };
  };
  this.SetWriteCallBack = function (H) {
    var Result = null;
    Result = $impl.WriteCallBack;
    $impl.WriteCallBack = H;
    return Result;
  };
  $mod.$init = function () {
    rtl.exitcode = 0;
  };
},null,function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  $impl.WriteBuf = "";
  $impl.WriteCallBack = null;
});
rtl.module("JS",["System"],function () {
  "use strict";
  var $mod = this;
});
rtl.module("weborworker",["System","JS"],function () {
  "use strict";
  var $mod = this;
});
rtl.module("Web",["System","JS","weborworker"],function () {
  "use strict";
  var $mod = this;
});
rtl.module("graph",["System"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  this.ScreenW = 640;
  this.ScreenH = 480;
  this.GraphActive = function () {
    var Result = false;
    Result = $impl.Ctx !== null;
    return Result;
  };
  this.ClearDevice = function () {
    var i = 0;
    if (rtl.length($impl.FB) === 0) return;
    for (i = 0; i <= 307199; i++) $impl.FB[i] = 0;
  };
},["JS","Web","weborworker","crt"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  $impl.FB = [];
  $impl.Ctx = null;
});
rtl.module("crt",["System","JS"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  this.KeyPressed = function () {
    var Result = false;
    $impl.Install();
    Result = rtl.length($impl.Queue) > 0;
    return Result;
  };
  this.ReadKey = function () {
    var Result = "";
    var i = 0;
    $impl.Install();
    if (rtl.length($impl.Queue) === 0) {
      Result = "\x00";
      return Result;
    };
    Result = $impl.Queue[0];
    for (var $l = 0, $end = rtl.length($impl.Queue) - 2; $l <= $end; $l++) {
      i = $l;
      $impl.Queue[i] = $impl.Queue[i + 1];
    };
    $impl.Queue = rtl.arraySetLength($impl.Queue,"",rtl.length($impl.Queue) - 1);
    return Result;
  };
  this.AskReal = function (prompt) {
    var Result = null;
    Result = $impl.AskPrompt(prompt,true);
    return Result;
  };
  this.AskString = function (prompt) {
    var Result = null;
    Result = $impl.AskPrompt(prompt,false);
    return Result;
  };
  this.ReadKeyA = function () {
    var Result = null;
    $impl.Install();
    Result = new Promise(function (resolve, reject) {
      const poll = () => {
        if (pas.crt.KeyPressed()) { resolve(pas.crt.ReadKey().charCodeAt(0)); }
        else setTimeout(poll, 50);
      };
      poll();
    });
    return Result;
  };
  this.GotoXY = function (x, y) {
    $impl.TextEnsure();
    if ((x < 1) || (x > 80) || (y < 1) || (y > 25)) return;
    $impl.CurX = x;
    $impl.CurY = y;
  };
  this.ClrScr = function () {
    var i = 0;
    if (pas.graph.GraphActive()) {
      pas.graph.ClearDevice();
      return;
    };
    $impl.TextEnsure();
    for (i = 0; i <= 1999; i++) {
      $impl.CellCh[i] = " ";
      $impl.CellFg[i] = $impl.CurFg;
      $impl.CellBg[i] = $impl.CurBg;
    };
    $impl.CurX = 1;
    $impl.CurY = 1;
  };
  this.Randomize = function () {
  };
  $mod.$init = function () {
    if ($mod.KeyPressed()) $mod.ReadKey();
    pas.System.SetWriteCallBack(function (S, NewLine) {
      if (pas.graph.GraphActive()) return;
      $impl.TextEnsure();
      $impl.HandleWrite(S,NewLine);
    });
  };
},["Web","graph"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  $impl.Queue = [];
  $impl.Installed = false;
  $impl.PromptActive = false;
  $impl.KeyBufferMax = 16;
  $impl.Push = function (c) {
    if (rtl.length($impl.Queue) >= 16) return;
    $impl.Queue = rtl.arraySetLength($impl.Queue,"",rtl.length($impl.Queue) + 1);
    $impl.Queue[rtl.length($impl.Queue) - 1] = c;
  };
  $impl.OnKeyDown = function (aEvent) {
    var Result = false;
    if ($impl.PromptActive) {
      Result = true;
      return Result;
    };
    var $tmp = aEvent.key;
    if ($tmp === "ArrowLeft") {
      $impl.Push("\x00");
      $impl.Push("K");
    } else if ($tmp === "ArrowRight") {
      $impl.Push("\x00");
      $impl.Push("M");
    } else if ($tmp === "ArrowUp") {
      $impl.Push("\x00");
      $impl.Push("H");
    } else if ($tmp === "ArrowDown") {
      $impl.Push("\x00");
      $impl.Push("P");
    } else if ($tmp === "Escape") {
      $impl.Push("\x1B")}
     else if ($tmp === "Enter") {
      $impl.Push("\r")}
     else if ($tmp === " ") {
      $impl.Push(" ")}
     else {
      if (aEvent.key.length === 1) $impl.Push(aEvent.key.charAt(0));
    };
    if (pas.System.Copy(aEvent.key,1,5) === "Arrow") aEvent.preventDefault();
    Result = true;
    return Result;
  };
  $impl.Install = function () {
    if ($impl.Installed) return;
    $impl.Installed = true;
    document.addEventListener("keydown",$impl.OnKeyDown);
  };
  $impl.AskPrompt = function (prompt, numeric) {
    var Result = null;
    $impl.Install();
    Result = new Promise(function (resolve, reject) {
      const box = document.createElement('div');
      box.style.cssText = 'position:fixed;inset:auto 0 40% 0;display:flex;justify-content:center;z-index:99;';
      const line = document.createElement('div');
      line.style.cssText = 'background:#000;color:#fff;font:16px/24px ui-monospace,Menlo,monospace;padding:8px 16px;border:1px solid #545454;white-space:pre;';
      box.appendChild(line);
      let buf = '';
      let done = false;
      const paint = () => { line.textContent = prompt + ' ' + buf + '▎'; };
      // feed() is shared by live keydowns and the type-ahead drain below.
      const feed = (key) => {
        if (key === 'Enter') {
          if (numeric) {
            const n = parseFloat(buf);
            if (!isFinite(n)) { buf = ''; paint(); return false; }
            done = true;
            $impl.PromptActive = false;
            document.removeEventListener('keydown', onKey, true);
            box.remove();
            resolve(n);
            return true;
          }
          done = true;
          $impl.PromptActive = false;
          document.removeEventListener('keydown', onKey, true);
          box.remove();
          resolve(buf);
          return true;
        }
        if (key === 'Backspace') { buf = buf.slice(0, -1); paint(); return false; }
        if (numeric ? /^[0-9.\-]$/.test(key) : key.length === 1) { buf += key; paint(); }
        return false;
      };
      const onKey = (e) => {
        // Esc must stay quittable mid-prompt: let it propagate to the
        // bundle's page-level listener (retro:quit to the NC parent).
        if (e.key === 'Escape') return;
        feed(e.key);
        e.stopPropagation();
      };
      paint();
      document.body.appendChild(box);
      // DOS type-ahead: keys typed before this prompt appeared are waiting in
      // the crt queue — drain them first (a fast typist never loses input).
      while (!done && pas.crt.KeyPressed()) {
        const c = pas.crt.ReadKey();
        const code = c.charCodeAt(0);
        if (code === 0) { if (pas.crt.KeyPressed()) pas.crt.ReadKey(); continue; } // ext scancode pair
        if (code === 27) continue; // a queued Esc quits (page listener), never joins a name
        feed(code === 13 ? 'Enter' : (code === 8 ? 'Backspace' : c));
      }
      if (!done) {
        $impl.PromptActive = true; // the queue must NOT also record prompt keys (see var)
        document.addEventListener('keydown', onKey, true); // capture: the prompt owns the keyboard
      };
    });
    return Result;
  };
  $impl.Cols = 80;
  $impl.Rows = 25;
  $impl.CellW = 8;
  $impl.CellH = 16;
  $impl.Css = ["#000000","#0000a8","#00a800","#00a8a8","#a80000","#a800a8","#a85400","#a8a8a8","#545454","#5454ff","#54ff54","#54ffff","#ff5454","#ff54ff","#ffff54","#ffffff"];
  $impl.TextActive = false;
  $impl.TextCanvas = null;
  $impl.TextCtx = null;
  $impl.CellCh = [];
  $impl.CellFg = [];
  $impl.CellBg = [];
  $impl.CurX = 1;
  $impl.CurY = 1;
  $impl.CurFg = 7;
  $impl.CurBg = 0;
  $impl.CtrlGlyph = function (code) {
    var Result = "";
    var $tmp = code;
    if ($tmp === 16) {
      Result = "►"}
     else if ($tmp === 17) {
      Result = "◄"}
     else if ($tmp === 24) {
      Result = "↑"}
     else if ($tmp === 25) {
      Result = "↓"}
     else if ($tmp === 30) {
      Result = "▲"}
     else if ($tmp === 31) {
      Result = "▼"}
     else {
      Result = " ";
    };
    return Result;
  };
  $impl.HighGlyph = function (code) {
    var Result = "";
    var $tmp = code;
    if ($tmp === 179) {
      Result = "│"}
     else if ($tmp === 191) {
      Result = "┐"}
     else if ($tmp === 192) {
      Result = "└"}
     else if ($tmp === 196) {
      Result = "─"}
     else if ($tmp === 217) {
      Result = "┘"}
     else if ($tmp === 218) {
      Result = "┌"}
     else {
      Result = String.fromCharCode(code);
    };
    return Result;
  };
  $impl.TextEnsure = function () {
    var i = 0;
    if ($impl.TextActive) return;
    $impl.TextActive = true;
    $impl.TextCanvas = document.getElementById("screen");
    if ($impl.TextCanvas === null) return;
    $impl.TextCanvas.width = 80 * 8;
    $impl.TextCanvas.height = 25 * 16;
    $impl.TextCtx = $impl.TextCanvas.getContext("2d");
    $impl.CellCh = rtl.arraySetLength($impl.CellCh,"",80 * 25);
    $impl.CellFg = rtl.arraySetLength($impl.CellFg,0,80 * 25);
    $impl.CellBg = rtl.arraySetLength($impl.CellBg,0,80 * 25);
    for (i = 0; i <= 1999; i++) {
      $impl.CellCh[i] = " ";
      $impl.CellFg[i] = 7;
      $impl.CellBg[i] = 0;
    };
    window.requestAnimationFrame($impl.TextPaint);
  };
  $impl.HandleWrite = function (S, NewLine) {
    var txt = "";
    var k = 0;
    var code = 0;
    var g = "";
    txt = "" + S;
    for (var $l = 1, $end = txt.length; $l <= $end; $l++) {
      k = $l;
      code = txt.charCodeAt(k - 1);
      if (code === 13) {
        $impl.CurX = 1;
        continue;
      };
      if (code === 10) {
        $impl.CurX = 1;
        $impl.CurY += 1;
        continue;
      };
      if (code < 32) {
        g = $impl.CtrlGlyph(code)}
       else if (code > 126) {
        g = $impl.HighGlyph(code)}
       else g = txt.charAt(k - 1);
      if (($impl.CurX >= 1) && ($impl.CurX <= 80) && ($impl.CurY >= 1) && ($impl.CurY <= 25)) {
        $impl.CellCh[(($impl.CurY - 1) * 80) + ($impl.CurX - 1)] = g;
        $impl.CellFg[(($impl.CurY - 1) * 80) + ($impl.CurX - 1)] = $impl.CurFg;
        $impl.CellBg[(($impl.CurY - 1) * 80) + ($impl.CurX - 1)] = $impl.CurBg;
      };
      $impl.CurX += 1;
      if ($impl.CurX > 80) {
        $impl.CurX = 1;
        $impl.CurY += 1;
      };
    };
    if (NewLine) {
      $impl.CurX = 1;
      $impl.CurY += 1;
    };
    while ($impl.CurY > 25) {
      for (k = 0; k <= 1919; k++) {
        $impl.CellCh[k] = $impl.CellCh[k + 80];
        $impl.CellFg[k] = $impl.CellFg[k + 80];
        $impl.CellBg[k] = $impl.CellBg[k + 80];
      };
      for (k = 1920; k <= 1999; k++) {
        $impl.CellCh[k] = " ";
        $impl.CellFg[k] = 7;
        $impl.CellBg[k] = $impl.CurBg;
      };
      $impl.CurY -= 1;
    };
  };
  $impl.TextPaint = function (aTime) {
    var x = 0;
    var y = 0;
    var i = 0;
    if (!$impl.TextActive) return;
    if ($impl.TextCtx !== null) {
      $impl.TextCtx.font = '16px "IBM VGA", ui-monospace, Menlo, monospace';
      $impl.TextCtx.textBaseline = "top";
      for (y = 0; y <= 24; y++) for (x = 0; x <= 79; x++) {
        i = (y * 80) + x;
        $impl.TextCtx["fillStyle"] = $impl.Css[$impl.CellBg[i] & 15];
        $impl.TextCtx.fillRect(x * 8,y * 16,8,16);
        if ($impl.CellCh[i] !== " ") {
          $impl.TextCtx["fillStyle"] = $impl.Css[$impl.CellFg[i] & 15];
          $impl.TextCtx.fillText($impl.CellCh[i],x * 8,y * 16);
        };
      };
    };
    window.requestAnimationFrame($impl.TextPaint);
  };
});
rtl.module("tpfiles",["System"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  rtl.recNewT($mod,"Text",function () {
    this.name = "";
    this.cursor = 0;
    this.col = 0;
    this.mode = 0;
    this.$eq = function (b) {
      return (this.name === b.name) && (this.cursor === b.cursor) && (this.col === b.col) && (this.mode === b.mode);
    };
    this.$assign = function (s) {
      this.name = s.name;
      this.cursor = s.cursor;
      this.col = s.col;
      this.mode = s.mode;
      return this;
    };
  });
  this.Assign = function (f, path) {
    f.name = $impl.NormName(path);
    f.cursor = 0;
    f.col = 0;
    f.mode = 0;
  };
  this.Reset = function (f) {
    if ($impl.GetLines(f.name) == null) $impl.RTE(2);
    f.cursor = 0;
    f.col = 0;
    f.mode = 1;
  };
  this.Append = function (f) {
    if ($impl.GetLines(f.name) == null) $impl.RTE(2);
    f.mode = 2;
  };
  this.ReadlnT = function (f, s) {
    var lines = undefined;
    if (f.mode !== 1) $impl.RTE(104);
    lines = $impl.GetLines(f.name);
    if (lines == null) $impl.RTE(2);
    if (f.cursor >= lines.length) { $impl.RTE(100); }
    s.set(lines[f.cursor].substring(f.col));
    f.cursor = f.cursor + 1;
    f.col = 0;
  };
  this.ReadlnLong = function (f, n) {
    var s = "";
    var v = 0.0;
    $mod.ReadlnT(f,{get: function () {
        return s;
      }, set: function (v) {
        s = v;
      }});
    var t = s.trim();
    v = t === '' ? NaN : Number(t);
    if (!(v === v)) $impl.RTE(106);
    n.set(pas.System.Trunc(v));
  };
  this.WritelnT = function (f, s) {
    var lines = undefined;
    if (f.mode !== 2) $impl.RTE(105);
    lines = $impl.GetLines(f.name);
    if (lines == null) $impl.RTE(2);
    lines.push(s);
    $impl.PutLines(f.name,lines);
  };
  this.WritelnLong = function (f, n) {
    var s = "";
    s = String(n);
    $mod.WritelnT(f,s);
  };
  this.Eof = function () {
    var Result = false;
    Result = false;
    return Result;
  };
  this.Halt = function () {
    try { parent.postMessage({ type: 'retro:quit' }, '*'); } catch (e) {}
    throw new Error('halt');
  };
},["crt"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  $impl.RTE = function (code) {
    pas.System.Writeln();
    pas.System.Writeln("Runtime error ",code,".");
    throw new Error('TP runtime error ' + code);
  };
  $impl.NormName = function (path) {
    var Result = "";
    Result = path;
    var p = path.toLowerCase();
    var i = Math.max(p.lastIndexOf('\\'), p.lastIndexOf('/'));
    Result = p.substring(i + 1);
    return Result;
  };
  $impl.GetLines = function (name) {
    var Result = undefined;
    Result = null;
    var ls = null;
    try { ls = localStorage.getItem('retro:' + (window.__retroSlug || 'game') + ':' + name); } catch (e) {}
    if (ls != null) { Result = JSON.parse(ls); return Result; }
    // English build: prefer a data.en/ override for this file; fall back to the
    // base (Ukrainian) map. Language-neutral files (card art) have no override.
    if (window.__retroLang === 'en' && window.__retroFilesEn &&
        Object.prototype.hasOwnProperty.call(window.__retroFilesEn, name)) {
      Result = window.__retroFilesEn[name]; return Result;
    }
    var m = window.__retroFiles || {};
    Result = Object.prototype.hasOwnProperty.call(m, name) ? m[name] : null;
    return Result;
  };
  $impl.PutLines = function (name, lines) {
    try { localStorage.setItem('retro:' + (window.__retroSlug || 'game') + ':' + name, JSON.stringify(lines)); } catch (e) {};
  };
});
rtl.module("nls",["System"],function () {
  "use strict";
  var $mod = this;
  this.GameLang = function () {
    var Result = "";
    Result = "ua";
    Result = (typeof window !== 'undefined' && window.__retroLang === 'en') ? 'en' : 'ua';
    return Result;
  };
  this.Loc = function (en, ua) {
    var Result = "";
    if ($mod.GameLang() === "en") {
      Result = en}
     else Result = ua;
    return Result;
  };
});
rtl.module("program",["System","JS","crt","tpfiles","nls"],function () {
  "use strict";
  var $mod = this;
  this.sel = "";
  this.balans = 0;
  this.a = 0;
  this.first_picture = async function () {
    var tb = pas.tpfiles.Text.$new();
    var str = "";
    var n = 0;
    var bk = 0;
    var flag = false;
    pas.crt.ClrScr();
    flag = false;
    pas.tpfiles.Assign(tb,"C:\\cash\\bakkara\\textbak.txt");
    pas.tpfiles.Reset(tb);
    for (n = 1; n <= 23; n++) {
      pas.tpfiles.ReadlnT(tb,{get: function () {
          return str;
        }, set: function (v) {
          str = v;
        }});
      pas.System.Writeln(str);
    };
    do {
      bk = pas.System.Trunc(await pas.crt.ReadKeyA());
      if (bk === 13) {
        flag = true;
        pas.crt.ClrScr();
      };
    } while (!flag);
  };
  this.choice = async function () {
    var Result = "";
    var tm = pas.tpfiles.Text.$new();
    var n = 0;
    var bk = "";
    var str = "";
    var flag = false;
    pas.tpfiles.Assign(tm,"C:\\cash\\bakkara\\textmenu.txt");
    pas.tpfiles.Reset(tm);
    for (n = 1; n <= 23; n++) {
      pas.tpfiles.ReadlnT(tm,{get: function () {
          return str;
        }, set: function (v) {
          str = v;
        }});
      pas.System.Writeln(str);
    };
    do {
      bk = String.fromCharCode(pas.System.Trunc(await pas.crt.ReadKeyA()));
      var $tmp = bk;
      if (($tmp === "s") || ($tmp === "S") || ($tmp === "o") || ($tmp === "O") || ($tmp === "i") || ($tmp === "I") || ($tmp === "q") || ($tmp === "Q")) flag = true;
      Result = bk;
    } while (!flag);
    return Result;
  };
  this.Informations = async function () {
    var fi = pas.tpfiles.Text.$new();
    var ch = 0;
    var n = 0;
    var str = "";
    var flag = false;
    pas.tpfiles.Assign(fi,"c:\\cash\\bakkara\\info.txt");
    pas.tpfiles.Reset(fi);
    for (n = 1; n <= 23; n++) {
      pas.tpfiles.ReadlnT(fi,{get: function () {
          return str;
        }, set: function (v) {
          str = v;
        }});
      pas.System.Writeln(str);
    };
    pas.System.Writeln(pas.nls.Loc("Press Esc to leave the info screen","Натисніть Esc, щоб вийти з інформації"));
    do {
      ch = pas.System.Trunc(await pas.crt.ReadKeyA());
      if (ch === 27) flag = true;
    } while (!flag);
  };
  this.quit = async function () {
    var fq = pas.tpfiles.Text.$new();
    var str = "";
    var n = 0;
    var ch = "";
    pas.tpfiles.Assign(fq,"c:\\cash\\bakkara\\quit.txt");
    pas.tpfiles.Reset(fq);
    for (n = 1; n <= 23; n++) {
      pas.tpfiles.ReadlnT(fq,{get: function () {
          return str;
        }, set: function (v) {
          str = v;
        }});
      pas.System.Writeln(str);
    };
    do {
      ch = String.fromCharCode(pas.System.Trunc(await pas.crt.ReadKeyA()));
      var $tmp = ch;
      if (($tmp === "y") || ($tmp === "Y")) {
        pas.tpfiles.Halt()}
       else if (($tmp === "n") || ($tmp === "N")) await $mod.choice();
    } while (!false);
  };
  this.write_bal = function (bals) {
    var fsm = pas.tpfiles.Text.$new();
    var n = 0;
    var str = "";
    pas.tpfiles.Assign(fsm,"c:\\cash\\bakkara\\fsm1.txt");
    pas.tpfiles.Reset(fsm);
    for (n = 1; n <= 5; n++) {
      pas.tpfiles.ReadlnT(fsm,{get: function () {
          return str;
        }, set: function (v) {
          str = v;
        }});
      pas.System.Writeln(str);
    };
    pas.crt.GotoXY(33,4);
    pas.System.Writeln(bals);
  };
  this.player = async function () {
    var Result = 0;
    var n = 0;
    var fsm = pas.tpfiles.Text.$new();
    var str = "";
    var flag = false;
    pas.tpfiles.Assign(fsm,"c:\\cash\\bakkara\\fsm2.txt");
    pas.tpfiles.Reset(fsm);
    for (n = 1; n <= 5; n++) {
      pas.tpfiles.ReadlnT(fsm,{get: function () {
          return str;
        }, set: function (v) {
          str = v;
        }});
      pas.System.Writeln(str);
    };
    flag = false;
    do {
      var $tmp = String.fromCharCode(pas.System.Trunc(await pas.crt.ReadKeyA()));
      if (($tmp === "f") || ($tmp === "F")) {
        Result = 1;
        flag = true;
      } else if (($tmp === "s") || ($tmp === "S")) {
        Result = 2;
        flag = true;
      } else if (($tmp === "n") || ($tmp === "N")) {
        Result = 0;
        flag = true;
      };
    } while (!flag);
    return Result;
  };
  this.stavka = async function () {
    var Result = 0;
    var n = 0;
    var s = 0;
    var fsm = pas.tpfiles.Text.$new();
    var str = "";
    pas.tpfiles.Assign(fsm,"c:\\cash\\bakkara\\fsm3.txt");
    pas.tpfiles.Reset(fsm);
    for (n = 1; n <= 5; n++) {
      pas.tpfiles.ReadlnT(fsm,{get: function () {
          return str;
        }, set: function (v) {
          str = v;
        }});
      pas.System.Writeln(str);
    };
    s = pas.System.Trunc(await pas.crt.AskReal(pas.nls.Loc("Bet (hryvnias)","Ставка (гривень)")));
    Result = s;
    return Result;
  };
  this.random_kart = function () {
    var Result = 0;
    pas.crt.Randomize();
    Result = pas.System.Random(54) + 1;
    return Result;
  };
  var name_of_files = ["k1","k2","k3","k4","k5","k6","k7","k8","k9","k10","k11","k12","k13","k14","k15","k16","k17","k18","k19","k20","k21","k22","k23","k24","k25","k26","k27","k28","k29","k30","k31","k32","k33","k34","k35","k36","k37","k38","k39","k40","k41","k42","k43","k44","k45","k46","k47","k48","k49","k50","k51","k52","k53","k54"];
  this.num_kart = async function (num) {
    var Result = 0;
    var x = 0;
    var h2 = 0;
    var fk = pas.tpfiles.Text.$new();
    var kart = 0;
    var str = "";
    var nf = "";
    if (num <= 3) {
      x = 3 + ((num - 1) * 12)}
     else x = 43 + ((num - 4) * 12);
    kart = $mod.random_kart();
    Result = kart;
    nf = name_of_files[kart - 1];
    pas.tpfiles.Assign(fk,"c:\\cash\\bakkara\\" + nf);
    pas.tpfiles.Reset(fk);
    for (h2 = 1; h2 <= 17; h2++) {
      pas.tpfiles.ReadlnT(fk,{get: function () {
          return str;
        }, set: function (v) {
          str = v;
        }});
      pas.crt.GotoXY(x,8 + h2);
      pas.System.Write(str);
    };
    return Result;
  };
  this.palka = function () {
    var y = 0;
    var h3 = 0;
    y = 9;
    for (h3 = 1; h3 <= 16; h3++) {
      pas.crt.GotoXY(40,y);
      pas.System.Write("|");
      y += 1;
    };
  };
  this.win = function (pl, karts) {
    var Result = false;
    var n = 0;
    var sum1 = 0;
    var sum2 = 0;
    var sel = 0;
    var b = rtl.arraySetLength(null,0,6);
    pas.crt.ClrScr();
    sum1 = 0;
    sum2 = 0;
    for (n = 1; n <= 6; n++) {
      var $tmp = karts[n];
      if (($tmp === 53) || ($tmp === 54)) {
        b[n - 1] = 25}
       else {
        var $tmp1 = karts[n] % 13;
        if ($tmp1 === 0) {
          b[n - 1] = 14}
         else if ($tmp1 === 1) {
          b[n - 1] = 2}
         else if ($tmp1 === 2) {
          b[n - 1] = 3}
         else if ($tmp1 === 3) {
          b[n - 1] = 4}
         else if ($tmp1 === 4) {
          b[n - 1] = 5}
         else if ($tmp1 === 5) {
          b[n - 1] = 6}
         else if ($tmp1 === 6) {
          b[n - 1] = 7}
         else if ($tmp1 === 7) {
          b[n - 1] = 8}
         else if ($tmp1 === 8) {
          b[n - 1] = 9}
         else if ($tmp1 === 9) {
          b[n - 1] = 10}
         else if ($tmp1 === 10) {
          b[n - 1] = 11}
         else if ($tmp1 === 11) {
          b[n - 1] = 12}
         else if ($tmp1 === 12) b[n - 1] = 13;
      };
    };
    for (n = 1; n <= 3; n++) sum1 = sum1 + b[n - 1];
    for (n = 4; n <= 6; n++) sum2 = sum2 + b[n - 1];
    pas.crt.GotoXY(35,12);
    pas.System.Writeln(pas.nls.Loc("Player 1 scored ","Гравець 1 набрав "),sum1,pas.nls.Loc(" points"," балів"));
    pas.System.Writeln();
    pas.System.Writeln(pas.nls.Loc("Player 2 scored ","Гравець 2 набрав "),sum2,pas.nls.Loc(" points"," балів"));
    pas.System.Writeln();
    if (sum1 > sum2) {
      sel = 1;
      pas.System.Writeln(pas.nls.Loc("Player 1 wins","Гравець 1 переміг"));
    } else if (sum1 < sum2) {
      sel = 2;
      pas.System.Writeln(pas.nls.Loc("Player 2 wins","Гравець 2 переміг"));
    } else {
      sel = 0;
      pas.System.Writeln(pas.nls.Loc("Draw","Нічия"));
    };
    if (sel === pl) {
      Result = true}
     else Result = false;
    return Result;
  };
  this.Save = async function () {
    var fs = pas.tpfiles.Text.$new();
    var ch = "";
    var name_save = "";
    pas.crt.ClrScr();
    pas.crt.GotoXY(35,3);
    pas.tpfiles.Assign(fs,"c:\\cash\\bakkara\\saves.txt");
    pas.tpfiles.Append(fs);
    pas.System.Writeln(pas.nls.Loc("Enter your save name","Введіть імʼя збереження"));
    name_save = await pas.crt.AskString(pas.nls.Loc("Save name","Імʼя збереження"));
    pas.tpfiles.WritelnT(fs,name_save);
    pas.tpfiles.WritelnLong(fs,$mod.balans);
    pas.System.Writeln(pas.nls.Loc("Your game has been saved","Гру збережено"));
    pas.crt.ClrScr();
    pas.crt.GotoXY(35,10);
    pas.System.Writeln(pas.nls.Loc("Back to game (g) or main menu (m)?","Повернутись у гру (g) чи в головне меню (m)?"));
    do {
      ch = String.fromCharCode(pas.System.Trunc(await pas.crt.ReadKeyA()));
      var $tmp = ch;
      if (($tmp === "g") || ($tmp === "G")) {
        pas.tpfiles.Halt();
        $mod.a = 1;
        $mod.sel = "s";
      } else if (($tmp === "m") || ($tmp === "M")) await $mod.choice();
    } while (!false);
  };
  this.start = async function (balan) {
    var balans = 0;
    var post = 0;
    var pl = 0;
    var n = 0;
    var number_of_karts = rtl.arraySetLength(null,0,6);
    var flag = false;
    var chord = 0;
    var ch = "";
    balans = balan;
    do {
      pas.crt.ClrScr();
      $mod.write_bal(balans);
      pl = pas.System.Trunc(await $mod.player());
      post = pas.System.Trunc(await $mod.stavka());
      pas.crt.ClrScr();
      for (n = 1; n <= 6; n++) number_of_karts[n - 1] = pas.System.Trunc(await $mod.num_kart(n));
      pas.crt.GotoXY(16,25);
      pas.System.Write(pas.nls.Loc("Player 1","Гравець 1"));
      pas.crt.GotoXY(56,25);
      pas.System.Write(pas.nls.Loc("Player 2","Гравець 2"));
      $mod.palka();
      flag = false;
      do {
        chord = pas.System.Trunc(await pas.crt.ReadKeyA());
        if (chord === 13) flag = true;
      } while (!flag);
      flag = $mod.win(pl,number_of_karts.slice(0));
      if (flag) {
        pas.System.Writeln(pas.nls.Loc("You won","Ви виграли"));
        pas.System.Writeln(pas.nls.Loc("You won ","Ви виграли "),post,pas.nls.Loc(" hryvnias"," гривень"));
        balans = balans + post;
      } else {
        pas.System.Writeln(pas.nls.Loc("You lost","Ви програли"));
        pas.System.Writeln(pas.nls.Loc("You lost ","Ви програли "),post,pas.nls.Loc(" hryvnias"," гривень"));
        balans = balans - post;
      };
      pas.System.Writeln();
      pas.System.Writeln(pas.nls.Loc("Save the game?","Зберегти гру?"));
      pas.System.Writeln(pas.nls.Loc("y-yes            n-no","y-так            n-ні"));
      do {
        ch = String.fromCharCode(pas.System.Trunc(await pas.crt.ReadKeyA()));
        var $tmp = ch;
        if (($tmp === "y") || ($tmp === "Y") || ($tmp === "n") || ($tmp === "N")) flag = true;
      } while (!flag);
      if ((ch === "y") || (ch === "Y")) await $mod.Save();
    } while (!flag);
  };
  this.load = async function () {
    var fs = pas.tpfiles.Text.$new();
    var str = "";
    var st = "";
    var ch = "";
    var n = 0;
    pas.crt.ClrScr();
    pas.tpfiles.Assign(fs,"c:\\cash\\bakkara\\saves.txt");
    pas.tpfiles.Reset(fs);
    pas.System.Writeln(pas.nls.Loc("The save list follows: line 1 is the name, line 2 the balance","Зараз зʼявиться список збережень: рядок 1 — назва, рядок 2 — баланс"));
    while (!pas.tpfiles.Eof()) {
      for (n = 1; n <= 23; n++) {
        pas.tpfiles.ReadlnT(fs,{get: function () {
            return str;
          }, set: function (v) {
            str = v;
          }});
        pas.System.Writeln(str);
      };
      do {
      } while (!(pas.System.Trunc(await pas.crt.ReadKeyA()) === 13));
    };
    pas.System.Writeln(pas.nls.Loc('Enter your save name, or "Exit" to quit',"Введіть імʼя збереження, або «Вихід» щоб вийти"));
    str = await pas.crt.AskString(pas.nls.Loc("Save name","Імʼя збереження"));
    if (str === pas.nls.Loc("Exit","Вихід")) await $mod.choice();
    while (!pas.tpfiles.Eof()) {
      st = await pas.crt.AskString("");
      if (st === str) {
        pas.System.Writeln(pas.nls.Loc("Save found","Збереження знайдено"));
        pas.tpfiles.ReadlnLong(fs,{p: $mod, get: function () {
            return this.p.balans;
          }, set: function (v) {
            this.p.balans = v;
          }});
        pas.System.Writeln(pas.nls.Loc("Press Esc to start, or n to search again","Натисніть Esc, щоб почати, або n для повторного пошуку"));
        do {
          ch = String.fromCharCode(pas.System.Trunc(await pas.crt.ReadKeyA()));
          var $tmp = ch;
          if ($tmp === "\x1B") {
            await $mod.start($mod.balans)}
           else if (($tmp === "n") || ($tmp === "N")) await $mod.load();
        } while (!false);
      };
    };
  };
  this.options = async function () {
    var fo = pas.tpfiles.Text.$new();
    var n = 0;
    var str = "";
    var ch = "";
    pas.crt.ClrScr();
    pas.tpfiles.Assign(fo,"c:\\cash\\bakkara\\options.txt");
    pas.tpfiles.Reset(fo);
    for (n = 1; n <= 23; n++) {
      pas.tpfiles.ReadlnT(fo,{get: function () {
          return str;
        }, set: function (v) {
          str = v;
        }});
      pas.System.Writeln(str);
    };
    pas.System.Writeln(pas.nls.Loc("Press the submenu letter you want, or Esc to exit","Натисніть потрібну літеру підменю, або Esc щоб вийти"));
    do {
      ch = String.fromCharCode(pas.System.Trunc(await pas.crt.ReadKeyA()));
      var $tmp = ch;
      if (($tmp === "l") || ($tmp === "L")) {
        await $mod.load()}
       else if ($tmp === "\x1B") await $mod.choice();
    } while (!false);
  };
  this.Main = async function () {
    await $mod.first_picture();
    $mod.sel = await $mod.choice();
    $mod.balans = 500;
    var $tmp = $mod.sel;
    if (($tmp === "s") || ($tmp === "S")) {
      await $mod.start($mod.balans)}
     else if (($tmp === "o") || ($tmp === "O")) {
      await $mod.options()}
     else if (($tmp === "i") || ($tmp === "I")) {
      await $mod.Informations()}
     else if (($tmp === "q") || ($tmp === "Q")) await $mod.quit();
  };
  $mod.$main = function () {
    $mod.Main();
  };
});
