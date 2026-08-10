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
  rtl.createClass($mod,"TObject",null,function () {
    this.$init = function () {
    };
    this.$final = function () {
    };
    this.AfterConstruction = function () {
    };
    this.BeforeDestruction = function () {
    };
  });
  this.vtInteger = 0;
  this.vtExtended = 3;
  this.vtWideChar = 9;
  this.vtCurrency = 12;
  this.vtUnicodeString = 18;
  this.vtNativeInt = 19;
  rtl.recNewT($mod,"TVarRec",function () {
    this.VType = 0;
    this.VJSValue = undefined;
    this.$eq = function (b) {
      return (this.VType === b.VType) && (this.VJSValue === b.VJSValue) && (this.VJSValue === b.VJSValue) && (this.VJSValue === b.VJSValue) && (this.VJSValue === b.VJSValue) && (this.VJSValue === b.VJSValue) && (this.VJSValue === b.VJSValue) && (this.VJSValue === b.VJSValue);
    };
    this.$assign = function (s) {
      this.VType = s.VType;
      this.VJSValue = s.VJSValue;
      this.VJSValue = s.VJSValue;
      this.VJSValue = s.VJSValue;
      this.VJSValue = s.VJSValue;
      this.VJSValue = s.VJSValue;
      this.VJSValue = s.VJSValue;
      this.VJSValue = s.VJSValue;
      return this;
    };
  });
  this.VarRecs = function () {
    var Result = [];
    var i = 0;
    var v = null;
    Result = [];
    while (i < arguments.length) {
      v = $mod.TVarRec.$new();
      v.VType = Math.floor(arguments[i]);
      i += 1;
      v.VJSValue = arguments[i];
      i += 1;
      Result.push($mod.TVarRec.$clone(v));
    };
    return Result;
  };
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
  this.Int = function (A) {
    var Result = 0.0;
    Result = $mod.Trunc(A);
    return Result;
  };
  this.Copy = function (S, Index, Size) {
    if (Index<1) Index = 1;
    return (Size>0) ? S.substring(Index-1,Index+Size-1) : "";
  };
  this.Copy$1 = function (S, Index) {
    if (Index<1) Index = 1;
    return S.substr(Index-1);
  };
  this.Delete = function (S, Index, Size) {
    var h = "";
    if ((Index < 1) || (Index > S.get().length) || (Size <= 0)) return;
    h = S.get();
    S.set($mod.Copy(h,1,Index - 1) + $mod.Copy$1(h,Index + Size));
  };
  this.Pos = function (Search, InString) {
    return InString.indexOf(Search)+1;
  };
  this.Insert = function (Insertion, Target, Index) {
    var t = "";
    if (Insertion === "") return;
    t = Target.get();
    if (Index < 1) {
      Target.set(Insertion + t)}
     else if (Index > t.length) {
      Target.set(t + Insertion)}
     else Target.set($mod.Copy(t,1,Index - 1) + Insertion + $mod.Copy(t,Index,t.length));
  };
  this.upcase = function (c) {
    return c.toUpperCase();
  };
  this.val = function (S, NI, Code) {
    NI.set($impl.valint(S,-9007199254740991,9007199254740991,Code));
  };
  this.StringOfChar = function (c, l) {
    var Result = "";
    var i = 0;
    if ((l>0) && c.repeat) return c.repeat(l);
    Result = "";
    for (var $l = 1, $end = l; $l <= $end; $l++) {
      i = $l;
      Result = Result + c;
    };
    return Result;
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
  $impl.valint = function (S, MinVal, MaxVal, Code) {
    var Result = 0;
    var x = 0.0;
    if (S === "") {
      Code.set(1);
      return Result;
    };
    x = Number(S);
    if (isNaN(x)) {
      var $tmp = $mod.Copy(S,1,1);
      if ($tmp === "$") {
        x = Number("0x" + $mod.Copy$1(S,2))}
       else if ($tmp === "&") {
        x = Number("0o" + $mod.Copy$1(S,2))}
       else if ($tmp === "%") {
        x = Number("0b" + $mod.Copy$1(S,2))}
       else {
        Code.set(1);
        return Result;
      };
    };
    if (isNaN(x) || (x !== $mod.Int(x))) {
      Code.set(1)}
     else if ((x < MinVal) || (x > MaxVal)) {
      Code.set(2)}
     else {
      Result = $mod.Trunc(x);
      Code.set(0);
    };
    return Result;
  };
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
rtl.module("RTLConsts",["System"],function () {
  "use strict";
  var $mod = this;
  $mod.$resourcestrings = {SArgumentMissing: {org: 'Missing argument in format "%s"'}, SInvalidFormat: {org: 'Invalid format specifier : "%s"'}, SInvalidArgIndex: {org: 'Invalid argument index in format: "%s"'}};
});
rtl.module("SysUtils",["System","RTLConsts","JS"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  rtl.recNewT($mod,"TFormatSettings",function () {
    this.CurrencyDecimals = 0;
    this.CurrencyFormat = 0;
    this.CurrencyString = "";
    this.DateSeparator = "";
    this.DecimalSeparator = "";
    this.LongDateFormat = "";
    this.LongTimeFormat = "";
    this.NegCurrFormat = 0;
    this.ShortDateFormat = "";
    this.ShortTimeFormat = "";
    this.ThousandSeparator = "";
    this.TimeAMString = "";
    this.TimePMString = "";
    this.TimeSeparator = "";
    this.TwoDigitYearCenturyWindow = 0;
    this.InitLocaleHandler = null;
    this.$new = function () {
      var r = Object.create(this);
      r.DateTimeToStrFormat = rtl.arraySetLength(null,"",2);
      r.LongDayNames = rtl.arraySetLength(null,"",7);
      r.LongMonthNames = rtl.arraySetLength(null,"",12);
      r.ShortDayNames = rtl.arraySetLength(null,"",7);
      r.ShortMonthNames = rtl.arraySetLength(null,"",12);
      return r;
    };
    this.$eq = function (b) {
      return (this.CurrencyDecimals === b.CurrencyDecimals) && (this.CurrencyFormat === b.CurrencyFormat) && (this.CurrencyString === b.CurrencyString) && (this.DateSeparator === b.DateSeparator) && rtl.arrayEq(this.DateTimeToStrFormat,b.DateTimeToStrFormat) && (this.DecimalSeparator === b.DecimalSeparator) && (this.LongDateFormat === b.LongDateFormat) && rtl.arrayEq(this.LongDayNames,b.LongDayNames) && rtl.arrayEq(this.LongMonthNames,b.LongMonthNames) && (this.LongTimeFormat === b.LongTimeFormat) && (this.NegCurrFormat === b.NegCurrFormat) && (this.ShortDateFormat === b.ShortDateFormat) && rtl.arrayEq(this.ShortDayNames,b.ShortDayNames) && rtl.arrayEq(this.ShortMonthNames,b.ShortMonthNames) && (this.ShortTimeFormat === b.ShortTimeFormat) && (this.ThousandSeparator === b.ThousandSeparator) && (this.TimeAMString === b.TimeAMString) && (this.TimePMString === b.TimePMString) && (this.TimeSeparator === b.TimeSeparator) && (this.TwoDigitYearCenturyWindow === b.TwoDigitYearCenturyWindow);
    };
    this.$assign = function (s) {
      this.CurrencyDecimals = s.CurrencyDecimals;
      this.CurrencyFormat = s.CurrencyFormat;
      this.CurrencyString = s.CurrencyString;
      this.DateSeparator = s.DateSeparator;
      this.DateTimeToStrFormat = s.DateTimeToStrFormat.slice(0);
      this.DecimalSeparator = s.DecimalSeparator;
      this.LongDateFormat = s.LongDateFormat;
      this.LongDayNames = s.LongDayNames.slice(0);
      this.LongMonthNames = s.LongMonthNames.slice(0);
      this.LongTimeFormat = s.LongTimeFormat;
      this.NegCurrFormat = s.NegCurrFormat;
      this.ShortDateFormat = s.ShortDateFormat;
      this.ShortDayNames = s.ShortDayNames.slice(0);
      this.ShortMonthNames = s.ShortMonthNames.slice(0);
      this.ShortTimeFormat = s.ShortTimeFormat;
      this.ThousandSeparator = s.ThousandSeparator;
      this.TimeAMString = s.TimeAMString;
      this.TimePMString = s.TimePMString;
      this.TimeSeparator = s.TimeSeparator;
      this.TwoDigitYearCenturyWindow = s.TwoDigitYearCenturyWindow;
      return this;
    };
    this.GetJSLocale = function () {
      return Intl.DateTimeFormat().resolvedOptions().locale;
    };
    this.Create = function () {
      var Result = $mod.TFormatSettings.$new();
      Result.$assign($mod.TFormatSettings.Create$1($mod.TFormatSettings.GetJSLocale()));
      return Result;
    };
    this.Create$1 = function (ALocale) {
      var Result = $mod.TFormatSettings.$new();
      Result.LongDayNames = $impl.DefaultLongDayNames.slice(0);
      Result.ShortDayNames = $impl.DefaultShortDayNames.slice(0);
      Result.ShortMonthNames = $impl.DefaultShortMonthNames.slice(0);
      Result.LongMonthNames = $impl.DefaultLongMonthNames.slice(0);
      Result.DateTimeToStrFormat[0] = "c";
      Result.DateTimeToStrFormat[1] = "f";
      Result.DateSeparator = "-";
      Result.TimeSeparator = ":";
      Result.ShortDateFormat = "yyyy-mm-dd";
      Result.LongDateFormat = "ddd, yyyy-mm-dd";
      Result.ShortTimeFormat = "hh:nn";
      Result.LongTimeFormat = "hh:nn:ss";
      Result.DecimalSeparator = ".";
      Result.ThousandSeparator = ",";
      Result.TimeAMString = "AM";
      Result.TimePMString = "PM";
      Result.TwoDigitYearCenturyWindow = 50;
      Result.CurrencyFormat = 0;
      Result.NegCurrFormat = 0;
      Result.CurrencyDecimals = 2;
      Result.CurrencyString = "$";
      if ($mod.TFormatSettings.InitLocaleHandler != null) $mod.TFormatSettings.InitLocaleHandler($mod.UpperCase(ALocale),$mod.TFormatSettings.$clone(Result));
      return Result;
    };
  },true);
  rtl.createClass($mod,"Exception",pas.System.TObject,function () {
    this.LogMessageOnCreate = false;
    this.$init = function () {
      pas.System.TObject.$init.call(this);
      this.fMessage = "";
      this.FJSError = null;
    };
    this.$final = function () {
      this.FJSError = undefined;
      pas.System.TObject.$final.call(this);
    };
    this.Create$1 = function (Msg) {
      this.fMessage = Msg;
      this.FJSError = new Error();
      if (this.LogMessageOnCreate) pas.System.Writeln("Created exception ",this.$classname," with message: ",Msg);
      return this;
    };
    this.CreateFmt = function (Msg, Args) {
      this.Create$1($mod.Format(Msg,Args));
      return this;
    };
  });
  rtl.createClass($mod,"EExternal",$mod.Exception,function () {
  });
  rtl.createClass($mod,"EInvalidCast",$mod.Exception,function () {
  });
  rtl.createClass($mod,"EConvertError",$mod.Exception,function () {
  });
  rtl.createClass($mod,"EIntError",$mod.EExternal,function () {
  });
  rtl.createClass($mod,"ERangeError",$mod.EIntError,function () {
  });
  rtl.createClass($mod,"EAbstractError",$mod.Exception,function () {
  });
  this.TrimLeft = function (S) {
    return S.replace(/^[\s\uFEFF\xA0\x00-\x1f]+/,'');
  };
  this.UpperCase = function (s) {
    return s.toUpperCase();
  };
  this.Format = function (Fmt, Args) {
    var Result = "";
    Result = $mod.Format$1(Fmt,Args,$mod.FormatSettings);
    return Result;
  };
  this.Format$1 = function (Fmt, Args, aSettings) {
    var Result = "";
    var ChPos = 0;
    var OldPos = 0;
    var ArgPos = 0;
    var DoArg = 0;
    var Len = 0;
    var Hs = "";
    var ToAdd = "";
    var Index = 0;
    var Width = 0;
    var Prec = 0;
    var Left = false;
    var Fchar = "";
    var vq = 0;
    function ReadFormat() {
      var Result = "";
      var Value = 0;
      function ReadInteger() {
        var Code = 0;
        var ArgN = 0;
        if (Value !== -1) return;
        OldPos = ChPos;
        while ((ChPos <= Len) && (Fmt.charAt(ChPos - 1) <= "9") && (Fmt.charAt(ChPos - 1) >= "0")) ChPos += 1;
        if (ChPos > Len) $impl.DoFormatError(1,Fmt);
        if (Fmt.charAt(ChPos - 1) === "*") {
          if (Index === 255) {
            ArgN = ArgPos}
           else {
            ArgN = Index;
            Index += 1;
          };
          if ((ChPos > OldPos) || (ArgN > (rtl.length(Args) - 1))) $impl.DoFormatError(1,Fmt);
          ArgPos = ArgN + 1;
          var $tmp = Args[ArgN].VType;
          if ($tmp === 0) {
            Value = Args[ArgN].VJSValue}
           else if ($tmp === 19) {
            Value = Args[ArgN].VJSValue}
           else {
            $impl.DoFormatError(1,Fmt);
          };
          ChPos += 1;
        } else {
          if (OldPos < ChPos) {
            pas.System.val(pas.System.Copy(Fmt,OldPos,ChPos - OldPos),{get: function () {
                return Value;
              }, set: function (v) {
                Value = v;
              }},{get: function () {
                return Code;
              }, set: function (v) {
                Code = v;
              }});
            if (Code > 0) $impl.DoFormatError(1,Fmt);
          } else Value = -1;
        };
      };
      function ReadIndex() {
        if (Fmt.charAt(ChPos - 1) !== ":") {
          ReadInteger()}
         else Value = 0;
        if (Fmt.charAt(ChPos - 1) === ":") {
          if (Value === -1) $impl.DoFormatError(2,Fmt);
          Index = Value;
          Value = -1;
          ChPos += 1;
        };
      };
      function ReadLeft() {
        if (Fmt.charAt(ChPos - 1) === "-") {
          Left = true;
          ChPos += 1;
        } else Left = false;
      };
      function ReadWidth() {
        ReadInteger();
        if (Value !== -1) {
          Width = Value;
          Value = -1;
        };
      };
      function ReadPrec() {
        if (Fmt.charAt(ChPos - 1) === ".") {
          ChPos += 1;
          ReadInteger();
          if (Value === -1) Value = 0;
          Prec = Value;
        };
      };
      Index = 255;
      Width = -1;
      Prec = -1;
      Value = -1;
      ChPos += 1;
      if (Fmt.charAt(ChPos - 1) === "%") {
        Result = "%";
        return Result;
      };
      ReadIndex();
      ReadLeft();
      ReadWidth();
      ReadPrec();
      Result = pas.System.upcase(Fmt.charAt(ChPos - 1));
      return Result;
    };
    function Checkarg(AT, err) {
      var Result = false;
      Result = false;
      if (Index === 255) {
        DoArg = ArgPos}
       else DoArg = Index;
      ArgPos = DoArg + 1;
      if ((DoArg > (rtl.length(Args) - 1)) || (Args[DoArg].VType !== AT)) {
        if (err) $impl.DoFormatError(3,Fmt);
        ArgPos -= 1;
        return Result;
      };
      Result = true;
      return Result;
    };
    Result = "";
    Len = Fmt.length;
    ChPos = 1;
    OldPos = 1;
    ArgPos = 0;
    while (ChPos <= Len) {
      while ((ChPos <= Len) && (Fmt.charAt(ChPos - 1) !== "%")) ChPos += 1;
      if (ChPos > OldPos) Result = Result + pas.System.Copy(Fmt,OldPos,ChPos - OldPos);
      if (ChPos < Len) {
        Fchar = ReadFormat();
        var $tmp = Fchar;
        if ($tmp === "D") {
          if (Checkarg(0,false)) {
            ToAdd = $mod.IntToStr(Args[DoArg].VJSValue)}
           else if (Checkarg(19,true)) ToAdd = $mod.IntToStr(Args[DoArg].VJSValue);
          Width = Math.abs(Width);
          Index = Prec - ToAdd.length;
          if (ToAdd.charAt(0) !== "-") {
            ToAdd = pas.System.StringOfChar("0",Index) + ToAdd}
           else pas.System.Insert(pas.System.StringOfChar("0",Index + 1),{get: function () {
              return ToAdd;
            }, set: function (v) {
              ToAdd = v;
            }},2);
        } else if ($tmp === "U") {
          if (Checkarg(0,false)) {
            ToAdd = $mod.IntToStr(Args[DoArg].VJSValue >>> 0)}
           else if (Checkarg(19,true)) ToAdd = $mod.IntToStr(Args[DoArg].VJSValue);
          Width = Math.abs(Width);
          Index = Prec - ToAdd.length;
          ToAdd = pas.System.StringOfChar("0",Index) + ToAdd;
        } else if ($tmp === "E") {
          if (Checkarg(12,false)) {
            ToAdd = $mod.FloatToStrF$1(Args[DoArg].VJSValue / 10000,$mod.TFloatFormat.ffExponent,3,Prec,aSettings)}
           else if (Checkarg(3,true)) ToAdd = $mod.FloatToStrF$1(Args[DoArg].VJSValue,$mod.TFloatFormat.ffExponent,3,Prec,aSettings);
        } else if ($tmp === "F") {
          if (Checkarg(12,false)) {
            ToAdd = $mod.FloatToStrF$1(Args[DoArg].VJSValue / 10000,$mod.TFloatFormat.ffFixed,9999,Prec,aSettings)}
           else if (Checkarg(3,true)) ToAdd = $mod.FloatToStrF$1(Args[DoArg].VJSValue,$mod.TFloatFormat.ffFixed,9999,Prec,aSettings);
        } else if ($tmp === "G") {
          if (Checkarg(12,false)) {
            ToAdd = $mod.FloatToStrF$1(Args[DoArg].VJSValue / 10000,$mod.TFloatFormat.ffGeneral,Prec,3,aSettings)}
           else if (Checkarg(3,true)) ToAdd = $mod.FloatToStrF$1(Args[DoArg].VJSValue,$mod.TFloatFormat.ffGeneral,Prec,3,aSettings);
        } else if ($tmp === "N") {
          if (Checkarg(12,false)) {
            ToAdd = $mod.FloatToStrF$1(Args[DoArg].VJSValue / 10000,$mod.TFloatFormat.ffNumber,9999,Prec,aSettings)}
           else if (Checkarg(3,true)) ToAdd = $mod.FloatToStrF$1(Args[DoArg].VJSValue,$mod.TFloatFormat.ffNumber,9999,Prec,aSettings);
        } else if ($tmp === "M") {
          if (Checkarg(12,false)) {
            ToAdd = $mod.FloatToStrF$1(Args[DoArg].VJSValue / 10000,$mod.TFloatFormat.ffCurrency,9999,Prec,aSettings)}
           else if (Checkarg(3,true)) ToAdd = $mod.FloatToStrF$1(Args[DoArg].VJSValue,$mod.TFloatFormat.ffCurrency,9999,Prec,aSettings);
        } else if ($tmp === "S") {
          if (Checkarg(18,false)) {
            Hs = Args[DoArg].VJSValue}
           else if (Checkarg(9,true)) Hs = Args[DoArg].VJSValue;
          Index = Hs.length;
          if ((Prec !== -1) && (Index > Prec)) Index = Prec;
          ToAdd = pas.System.Copy(Hs,1,Index);
        } else if ($tmp === "P") {
          if (Checkarg(0,false)) {
            ToAdd = $mod.IntToHex(Args[DoArg].VJSValue,8)}
           else if (Checkarg(0,true)) ToAdd = $mod.IntToHex(Args[DoArg].VJSValue,16);
        } else if ($tmp === "X") {
          if (Checkarg(0,false)) {
            vq = Args[DoArg].VJSValue;
            Index = 16;
          } else if (Checkarg(19,true)) {
            vq = Args[DoArg].VJSValue;
            Index = 31;
          };
          if (Prec > Index) {
            ToAdd = $mod.IntToHex(vq,Index)}
           else {
            Index = 1;
            while ((rtl.shl(1,Index * 4) <= vq) && (Index < 16)) Index += 1;
            if (Index > Prec) Prec = Index;
            ToAdd = $mod.IntToHex(vq,Prec);
          };
        } else if ($tmp === "%") ToAdd = "%";
        if (Width !== -1) if (ToAdd.length < Width) if (!Left) {
          ToAdd = pas.System.StringOfChar(" ",Width - ToAdd.length) + ToAdd}
         else ToAdd = ToAdd + pas.System.StringOfChar(" ",Width - ToAdd.length);
        Result = Result + ToAdd;
      };
      ChPos += 1;
      OldPos = ChPos;
    };
    return Result;
  };
  this.IntToStr = function (Value) {
    var Result = "";
    Result = "" + Value;
    return Result;
  };
  this.IntToHex = function (Value, Digits) {
    var Result = "";
    Result = "";
    if (Value < 0) if (Value<0) Value = 0xFFFFFFFF + Value + 1;
    Result=Value.toString(16);
    Result = $mod.UpperCase(Result);
    while (Result.length < Digits) Result = "0" + Result;
    return Result;
  };
  this.TFloatFormat = {"0": "ffFixed", ffFixed: 0, "1": "ffGeneral", ffGeneral: 1, "2": "ffExponent", ffExponent: 2, "3": "ffNumber", ffNumber: 3, "4": "ffCurrency", ffCurrency: 4};
  this.FloatToStrF$1 = function (Value, format, Precision, Digits, aSettings) {
    var Result = "";
    var TS = "";
    var DS = "";
    DS = aSettings.DecimalSeparator;
    TS = aSettings.ThousandSeparator;
    var $tmp = format;
    if ($tmp === $mod.TFloatFormat.ffGeneral) {
      Result = $impl.FormatGeneralFloat(Value,Precision,DS)}
     else if ($tmp === $mod.TFloatFormat.ffExponent) {
      Result = $impl.FormatExponentFloat(Value,Precision,Digits,DS)}
     else if ($tmp === $mod.TFloatFormat.ffFixed) {
      Result = $impl.FormatFixedFloat(Value,Digits,DS)}
     else if ($tmp === $mod.TFloatFormat.ffNumber) {
      Result = $impl.FormatNumberFloat(Value,Digits,DS,TS)}
     else if ($tmp === $mod.TFloatFormat.ffCurrency) Result = $impl.FormatNumberCurrency(Value * 10000,Digits,aSettings);
    if ((format !== $mod.TFloatFormat.ffCurrency) && (Result.length > 1) && (Result.charAt(0) === "-")) $impl.RemoveLeadingNegativeSign({get: function () {
        return Result;
      }, set: function (v) {
        Result = v;
      }},DS,TS);
    return Result;
  };
  this.TimeSeparator = "";
  this.DateSeparator = "";
  this.ShortDateFormat = "";
  this.LongDateFormat = "";
  this.ShortTimeFormat = "";
  this.LongTimeFormat = "";
  this.DecimalSeparator = "";
  this.ThousandSeparator = "";
  this.TimeAMString = "";
  this.TimePMString = "";
  this.HoursPerDay = 24;
  this.MinsPerHour = 60;
  this.SecsPerMin = 60;
  this.MSecsPerSec = 1000;
  this.MinsPerDay = 24 * 60;
  this.SecsPerDay = 1440 * 60;
  this.MSecsPerDay = 86400 * 1000;
  this.MaxDateTime = 2958465.99999999;
  this.DateDelta = 693594;
  this.MonthDays = [[31,28,31,30,31,30,31,31,30,31,30,31],[31,29,31,30,31,30,31,31,30,31,30,31]];
  this.ShortMonthNames = rtl.arraySetLength(null,"",12);
  this.LongMonthNames = rtl.arraySetLength(null,"",12);
  this.ShortDayNames = rtl.arraySetLength(null,"",7);
  this.LongDayNames = rtl.arraySetLength(null,"",7);
  this.FormatSettings = $mod.TFormatSettings.$new();
  this.JSDateToDateTime = function (aDate, asUTC) {
    var Result = 0.0;
    if (asUTC) {
      Result = $mod.EncodeDate(aDate.getUTCFullYear(),aDate.getUTCMonth() + 1,aDate.getUTCDate()) + $mod.EncodeTime(aDate.getUTCHours(),aDate.getUTCMinutes(),aDate.getUTCSeconds(),aDate.getUTCMilliseconds())}
     else Result = $mod.EncodeDate(aDate.getFullYear(),aDate.getMonth() + 1,aDate.getDate()) + $mod.EncodeTime(aDate.getHours(),aDate.getMinutes(),aDate.getSeconds(),aDate.getMilliseconds());
    return Result;
  };
  this.TryEncodeDate = function (Year, Month, Day, date) {
    var Result = false;
    var c = 0;
    var ya = 0;
    Result = (Year > 0) && (Year < 10000) && (Month >= 1) && (Month <= 12) && (Day > 0) && (Day <= $mod.MonthDays[+$mod.IsLeapYear(Year)][Month - 1]);
    if (Result) {
      if (Month > 2) {
        Month -= 3}
       else {
        Month += 9;
        Year -= 1;
      };
      c = Math.floor(Year / 100);
      ya = Year - (100 * c);
      date.set(((146097 * c) >>> 2) + ((1461 * ya) >>> 2) + Math.floor(((153 * Month) + 2) / 5) + Day);
      date.set(date.get() - 693900);
    };
    return Result;
  };
  this.TryEncodeTime = function (Hour, Min, Sec, MSec, Time) {
    var Result = false;
    Result = (Hour < 24) && (Min < 60) && (Sec < 60) && (MSec < 1000);
    if (Result) Time.set(((Hour * 3600000) + (Min * 60000) + (Sec * 1000) + MSec) / 86400000);
    return Result;
  };
  this.EncodeDate = function (Year, Month, Day) {
    var Result = 0.0;
    if (!$mod.TryEncodeDate(Year,Month,Day,{get: function () {
        return Result;
      }, set: function (v) {
        Result = v;
      }})) throw $mod.EConvertError.$create("CreateFmt",["%s-%s-%s is not a valid date specification",pas.System.VarRecs(18,$mod.IntToStr(Year),18,$mod.IntToStr(Month),18,$mod.IntToStr(Day))]);
    return Result;
  };
  this.EncodeTime = function (Hour, Minute, Second, MilliSecond) {
    var Result = 0.0;
    if (!$mod.TryEncodeTime(Hour,Minute,Second,MilliSecond,{get: function () {
        return Result;
      }, set: function (v) {
        Result = v;
      }})) throw $mod.EConvertError.$create("CreateFmt",["%s:%s:%s.%s is not a valid time specification",pas.System.VarRecs(18,$mod.IntToStr(Hour),18,$mod.IntToStr(Minute),18,$mod.IntToStr(Second),18,$mod.IntToStr(MilliSecond))]);
    return Result;
  };
  this.DecodeDate = function (date, Year, Month, Day) {
    var ly = 0;
    var ld = 0;
    var lm = 0;
    var j = 0;
    if (date <= -693594) {
      Year.set(0);
      Month.set(0);
      Day.set(0);
    } else {
      if (date > 0) {
        date = date + (1 / (86400000 * 2))}
       else date = date - (1 / (86400000 * 2));
      if (date > $mod.MaxDateTime) date = $mod.MaxDateTime;
      j = rtl.shl(pas.System.Trunc(date) + 693900,2) - 1;
      ly = Math.floor(j / 146097);
      j = j - (146097 * ly);
      ld = rtl.lw(j >>> 2);
      j = Math.floor((rtl.lw(ld << 2) + 3) / 1461);
      ld = rtl.lw(((rtl.lw(ld << 2) + 7) - (1461 * j)) >>> 2);
      lm = Math.floor(((5 * ld) - 3) / 153);
      ld = Math.floor((((5 * ld) + 2) - (153 * lm)) / 5);
      ly = (100 * ly) + j;
      if (lm < 10) {
        lm += 3}
       else {
        lm -= 9;
        ly += 1;
      };
      Year.set(ly);
      Month.set(lm);
      Day.set(ld);
    };
  };
  this.Date = function () {
    var Result = 0.0;
    Result = pas.System.Trunc($mod.Now());
    return Result;
  };
  this.Now = function () {
    var Result = 0.0;
    Result = $mod.JSDateToDateTime(new Date(),false);
    return Result;
  };
  this.DayOfWeek = function (DateTime) {
    var Result = 0;
    Result = 1 + ((pas.System.Trunc(DateTime) - 1) % 7);
    if (Result <= 0) Result += 7;
    return Result;
  };
  this.IsLeapYear = function (Year) {
    var Result = false;
    Result = ((Year % 4) === 0) && (((Year % 100) !== 0) || ((Year % 400) === 0));
    return Result;
  };
  this.CurrencyFormat = 0;
  this.NegCurrFormat = 0;
  this.CurrencyDecimals = 0;
  this.CurrencyString = "";
  $mod.$init = function () {
    (function () {
      $impl.InitGlobalFormatSettings();
    })();
    $impl.DoClassRef($mod.EInvalidCast);
    $impl.DoClassRef($mod.EAbstractError);
    $impl.DoClassRef($mod.ERangeError);
    $mod.ShortMonthNames = $impl.DefaultShortMonthNames.slice(0);
    $mod.LongMonthNames = $impl.DefaultLongMonthNames.slice(0);
    $mod.ShortDayNames = $impl.DefaultShortDayNames.slice(0);
    $mod.LongDayNames = $impl.DefaultLongDayNames.slice(0);
  };
},null,function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  $impl.DefaultShortMonthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  $impl.DefaultLongMonthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  $impl.DefaultShortDayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  $impl.DefaultLongDayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  $impl.feInvalidFormat = 1;
  $impl.feMissingArgument = 2;
  $impl.feInvalidArgIndex = 3;
  $impl.DoFormatError = function (ErrCode, fmt) {
    var $tmp = ErrCode;
    if ($tmp === 1) {
      throw $mod.EConvertError.$create("CreateFmt",[rtl.getResStr(pas.RTLConsts,"SInvalidFormat"),pas.System.VarRecs(18,fmt)])}
     else if ($tmp === 2) {
      throw $mod.EConvertError.$create("CreateFmt",[rtl.getResStr(pas.RTLConsts,"SArgumentMissing"),pas.System.VarRecs(18,fmt)])}
     else if ($tmp === 3) throw $mod.EConvertError.$create("CreateFmt",[rtl.getResStr(pas.RTLConsts,"SInvalidArgIndex"),pas.System.VarRecs(18,fmt)]);
  };
  $impl.maxdigits = 15;
  $impl.ReplaceDecimalSep = function (S, DS) {
    var Result = "";
    var P = 0;
    P = pas.System.Pos(".",S);
    if (P > 0) {
      Result = pas.System.Copy(S,1,P - 1) + DS + pas.System.Copy(S,P + 1,S.length - P)}
     else Result = S;
    return Result;
  };
  $impl.FormatGeneralFloat = function (Value, Precision, DS) {
    var Result = "";
    var P = 0;
    var PE = 0;
    var Q = 0;
    var Exponent = 0;
    if ((Precision === -1) || (Precision > 15)) Precision = 15;
    Result = rtl.floatToStr(Value,Precision + 7);
    Result = $mod.TrimLeft(Result);
    P = pas.System.Pos(".",Result);
    if (P === 0) return Result;
    PE = pas.System.Pos("E",Result);
    if (PE === 0) {
      Result = $impl.ReplaceDecimalSep(Result,DS);
      return Result;
    };
    Q = PE + 2;
    Exponent = 0;
    while (Q <= Result.length) {
      Exponent = ((Exponent * 10) + Result.charCodeAt(Q - 1)) - 48;
      Q += 1;
    };
    if (Result.charAt((PE + 1) - 1) === "-") Exponent = -Exponent;
    if (((P + Exponent) < PE) && (Exponent > -6)) {
      Result = rtl.strSetLength(Result,PE - 1);
      if (Exponent >= 0) {
        for (var $l = 0, $end = Exponent - 1; $l <= $end; $l++) {
          Q = $l;
          Result = rtl.setCharAt(Result,P - 1,Result.charAt((P + 1) - 1));
          P += 1;
        };
        Result = rtl.setCharAt(Result,P - 1,".");
        P = 1;
        if (Result.charAt(P - 1) === "-") P += 1;
        while ((Result.charAt(P - 1) === "0") && (P < Result.length) && (pas.System.Copy(Result,P + 1,DS.length) !== DS)) pas.System.Delete({get: function () {
            return Result;
          }, set: function (v) {
            Result = v;
          }},P,1);
      } else {
        pas.System.Insert(pas.System.Copy("00000",1,-Exponent),{get: function () {
            return Result;
          }, set: function (v) {
            Result = v;
          }},P - 1);
        Result = rtl.setCharAt(Result,P - Exponent - 1,Result.charAt(P - Exponent - 1 - 1));
        Result = rtl.setCharAt(Result,P - 1,".");
        if (Exponent !== -1) Result = rtl.setCharAt(Result,P - Exponent - 1 - 1,"0");
      };
      Q = Result.length;
      while ((Q > 0) && (Result.charAt(Q - 1) === "0")) Q -= 1;
      if (Result.charAt(Q - 1) === ".") Q -= 1;
      if ((Q === 0) || ((Q === 1) && (Result.charAt(0) === "-"))) {
        Result = "0"}
       else Result = rtl.strSetLength(Result,Q);
    } else {
      while (Result.charAt(PE - 1 - 1) === "0") {
        pas.System.Delete({get: function () {
            return Result;
          }, set: function (v) {
            Result = v;
          }},PE - 1,1);
        PE -= 1;
      };
      if (Result.charAt(PE - 1 - 1) === DS) {
        pas.System.Delete({get: function () {
            return Result;
          }, set: function (v) {
            Result = v;
          }},PE - 1,1);
        PE -= 1;
      };
      if (Result.charAt((PE + 1) - 1) === "+") {
        pas.System.Delete({get: function () {
            return Result;
          }, set: function (v) {
            Result = v;
          }},PE + 1,1)}
       else PE += 1;
      while (Result.charAt((PE + 1) - 1) === "0") pas.System.Delete({get: function () {
          return Result;
        }, set: function (v) {
          Result = v;
        }},PE + 1,1);
    };
    Result = $impl.ReplaceDecimalSep(Result,DS);
    return Result;
  };
  $impl.FormatExponentFloat = function (Value, Precision, Digits, DS) {
    var Result = "";
    var P = 0;
    DS = $mod.FormatSettings.DecimalSeparator;
    if ((Precision === -1) || (Precision > 15)) Precision = 15;
    Result = rtl.floatToStr(Value,Precision + 7);
    while (Result.charAt(0) === " ") pas.System.Delete({get: function () {
        return Result;
      }, set: function (v) {
        Result = v;
      }},1,1);
    P = pas.System.Pos("E",Result);
    if (P === 0) {
      Result = $impl.ReplaceDecimalSep(Result,DS);
      return Result;
    };
    P += 2;
    if (Digits > 4) Digits = 4;
    Digits = (Result.length - P - Digits) + 1;
    if (Digits < 0) {
      pas.System.Insert(pas.System.Copy("0000",1,-Digits),{get: function () {
          return Result;
        }, set: function (v) {
          Result = v;
        }},P)}
     else while ((Digits > 0) && (Result.charAt(P - 1) === "0")) {
      pas.System.Delete({get: function () {
          return Result;
        }, set: function (v) {
          Result = v;
        }},P,1);
      if (P > Result.length) {
        pas.System.Delete({get: function () {
            return Result;
          }, set: function (v) {
            Result = v;
          }},P - 2,2);
        break;
      };
      Digits -= 1;
    };
    Result = $impl.ReplaceDecimalSep(Result,DS);
    return Result;
  };
  $impl.FormatFixedFloat = function (Value, Digits, DS) {
    var Result = "";
    if (Digits === -1) {
      Digits = 2}
     else if (Digits > 18) Digits = 18;
    Result = rtl.floatToStr(Value,0,Digits);
    if ((Result !== "") && (Result.charAt(0) === " ")) pas.System.Delete({get: function () {
        return Result;
      }, set: function (v) {
        Result = v;
      }},1,1);
    Result = $impl.ReplaceDecimalSep(Result,DS);
    return Result;
  };
  $impl.FormatNumberFloat = function (Value, Digits, DS, TS) {
    var Result = "";
    var P = 0;
    if (Digits === -1) {
      Digits = 2}
     else if (Digits > 15) Digits = 15;
    Result = rtl.floatToStr(Value,0,Digits);
    if ((Result !== "") && (Result.charAt(0) === " ")) pas.System.Delete({get: function () {
        return Result;
      }, set: function (v) {
        Result = v;
      }},1,1);
    P = pas.System.Pos(".",Result);
    if (P <= 0) P = Result.length + 1;
    Result = $impl.ReplaceDecimalSep(Result,DS);
    P -= 3;
    if ((TS !== "") && (TS !== "\x00")) while (P > 1) {
      if (Result.charAt(P - 1 - 1) !== "-") pas.System.Insert(TS,{get: function () {
          return Result;
        }, set: function (v) {
          Result = v;
        }},P);
      P -= 3;
    };
    return Result;
  };
  $impl.RemoveLeadingNegativeSign = function (AValue, DS, aThousandSeparator) {
    var Result = false;
    var i = 0;
    var TS = "";
    var StartPos = 0;
    Result = false;
    StartPos = 2;
    TS = aThousandSeparator;
    for (var $l = StartPos, $end = AValue.get().length; $l <= $end; $l++) {
      i = $l;
      Result = (AValue.get().charCodeAt(i - 1) in rtl.createSet(48,DS.charCodeAt(),69,43)) || (AValue.get().charAt(i - 1) === TS);
      if (!Result) break;
    };
    if (Result && (AValue.get().charAt(0) === "-")) pas.System.Delete(AValue,1,1);
    return Result;
  };
  $impl.FormatNumberCurrency = function (Value, Digits, aSettings) {
    var Result = "";
    var Negative = false;
    var P = 0;
    var CS = "";
    var DS = "";
    var TS = "";
    DS = aSettings.DecimalSeparator;
    TS = aSettings.ThousandSeparator;
    CS = aSettings.CurrencyString;
    if (Digits === -1) {
      Digits = aSettings.CurrencyDecimals}
     else if (Digits > 18) Digits = 18;
    Result = rtl.floatToStr(Value / 10000,0,Digits);
    Negative = Result.charAt(0) === "-";
    if (Negative) pas.System.Delete({get: function () {
        return Result;
      }, set: function (v) {
        Result = v;
      }},1,1);
    P = pas.System.Pos(".",Result);
    if (TS !== "") {
      if (P !== 0) {
        Result = $impl.ReplaceDecimalSep(Result,DS)}
       else P = Result.length + 1;
      P -= 3;
      while (P > 1) {
        pas.System.Insert(TS,{get: function () {
            return Result;
          }, set: function (v) {
            Result = v;
          }},P);
        P -= 3;
      };
    };
    if (Negative) $impl.RemoveLeadingNegativeSign({get: function () {
        return Result;
      }, set: function (v) {
        Result = v;
      }},DS,TS);
    if (!Negative) {
      var $tmp = aSettings.CurrencyFormat;
      if ($tmp === 0) {
        Result = CS + Result}
       else if ($tmp === 1) {
        Result = Result + CS}
       else if ($tmp === 2) {
        Result = CS + " " + Result}
       else if ($tmp === 3) Result = Result + " " + CS;
    } else {
      var $tmp1 = aSettings.NegCurrFormat;
      if ($tmp1 === 0) {
        Result = "(" + CS + Result + ")"}
       else if ($tmp1 === 1) {
        Result = "-" + CS + Result}
       else if ($tmp1 === 2) {
        Result = CS + "-" + Result}
       else if ($tmp1 === 3) {
        Result = CS + Result + "-"}
       else if ($tmp1 === 4) {
        Result = "(" + Result + CS + ")"}
       else if ($tmp1 === 5) {
        Result = "-" + Result + CS}
       else if ($tmp1 === 6) {
        Result = Result + "-" + CS}
       else if ($tmp1 === 7) {
        Result = Result + CS + "-"}
       else if ($tmp1 === 8) {
        Result = "-" + Result + " " + CS}
       else if ($tmp1 === 9) {
        Result = "-" + CS + " " + Result}
       else if ($tmp1 === 10) {
        Result = Result + " " + CS + "-"}
       else if ($tmp1 === 11) {
        Result = CS + " " + Result + "-"}
       else if ($tmp1 === 12) {
        Result = CS + " " + "-" + Result}
       else if ($tmp1 === 13) {
        Result = Result + "-" + " " + CS}
       else if ($tmp1 === 14) {
        Result = "(" + CS + " " + Result + ")"}
       else if ($tmp1 === 15) Result = "(" + Result + " " + CS + ")";
    };
    return Result;
  };
  $impl.InitGlobalFormatSettings = function () {
    $mod.FormatSettings.$assign($mod.TFormatSettings.Create());
    $mod.TimeSeparator = $mod.FormatSettings.TimeSeparator;
    $mod.DateSeparator = $mod.FormatSettings.DateSeparator;
    $mod.ShortDateFormat = $mod.FormatSettings.ShortDateFormat;
    $mod.LongDateFormat = $mod.FormatSettings.LongDateFormat;
    $mod.ShortTimeFormat = $mod.FormatSettings.ShortTimeFormat;
    $mod.LongTimeFormat = $mod.FormatSettings.LongTimeFormat;
    $mod.DecimalSeparator = $mod.FormatSettings.DecimalSeparator;
    $mod.ThousandSeparator = $mod.FormatSettings.ThousandSeparator;
    $mod.TimeAMString = $mod.FormatSettings.TimeAMString;
    $mod.TimePMString = $mod.FormatSettings.TimePMString;
    $mod.CurrencyFormat = $mod.FormatSettings.CurrencyFormat;
    $mod.NegCurrFormat = $mod.FormatSettings.NegCurrFormat;
    $mod.CurrencyDecimals = $mod.FormatSettings.CurrencyDecimals;
    $mod.CurrencyString = $mod.FormatSettings.CurrencyString;
  };
  $impl.DoClassRef = function (C) {
    if (C === null) ;
  };
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
},["JS","Web","weborworker","SysUtils","crt"],function () {
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
  this.Black = 0;
  this.Blue = 1;
  this.Green = 2;
  this.Cyan = 3;
  this.LightGray = 7;
  this.DarkGray = 8;
  this.Yellow = 14;
  this.White = 15;
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
  this.Delay = function (ms) {
    var Result = null;
    var wait = 0;
    $impl.Install();
    wait = Math.round(ms * $mod.DelayScale);
    if (wait < $mod.MinDelayMs) wait = $mod.MinDelayMs;
    Result = new Promise(function (resolve, reject) {
      window.setTimeout(function () {
        resolve(0);
      },wait);
    });
    return Result;
  };
  this.FrameDelay = function (ms) {
    var Result = null;
    $impl.Install();
    Result = new Promise(function (resolve, reject) {
      window.setTimeout(function () {
        resolve(0);
      },ms);
    });
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
  this.TextBackground = function (c) {
    $impl.TextEnsure();
    $impl.CurBg = c & 15;
  };
  this.TextColor = function (c) {
    $impl.TextEnsure();
    $impl.CurFg = c & 15;
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
  this.DelayScale = 0.064;
  this.MinDelayMs = 320;
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
rtl.module("EMatch",["System"],function () {
  "use strict";
  var $mod = this;
  this.FallType = {"0": "NoFall", NoFall: 0, "1": "YellowCard", YellowCard: 1, "2": "RedCard", RedCard: 2};
  rtl.recNewT($mod,"DateType",function () {
    this.date = 0;
    this.month = 0;
    this.year = 0;
    this.$eq = function (b) {
      return (this.date === b.date) && (this.month === b.month) && (this.year === b.year);
    };
    this.$assign = function (s) {
      this.date = s.date;
      this.month = s.month;
      this.year = s.year;
      return this;
    };
  });
  rtl.recNewT($mod,"StateType",function () {
    this.name = "";
    this.$eq = function (b) {
      return this.name === b.name;
    };
    this.$assign = function (s) {
      this.name = s.name;
      return this;
    };
  });
  rtl.recNewT($mod,"FootBaller",function () {
    this.name = "";
    this.surname = "";
    this.mark = 0;
    this.tiredness = 0;
    this.mood = 0;
    this.number = 0;
    this.here = false;
    this.play = false;
    this.fall = 0;
    this.$eq = function (b) {
      return (this.name === b.name) && (this.surname === b.surname) && (this.mark === b.mark) && (this.tiredness === b.tiredness) && (this.mood === b.mood) && (this.number === b.number) && (this.here === b.here) && (this.play === b.play) && (this.fall === b.fall);
    };
    this.$assign = function (s) {
      this.name = s.name;
      this.surname = s.surname;
      this.mark = s.mark;
      this.tiredness = s.tiredness;
      this.mood = s.mood;
      this.number = s.number;
      this.here = s.here;
      this.play = s.play;
      this.fall = s.fall;
      return this;
    };
  });
  rtl.recNewT($mod,"StadiumType",function () {
    this.Seats = 0;
    this.name = "";
    this.$new = function () {
      var r = Object.create(this);
      r.state = $mod.StateType.$new();
      return r;
    };
    this.$eq = function (b) {
      return (this.Seats === b.Seats) && (this.name === b.name) && this.state.$eq(b.state);
    };
    this.$assign = function (s) {
      this.Seats = s.Seats;
      this.name = s.name;
      this.state.$assign(s.state);
      return this;
    };
  });
  this.FootballerArray$clone = function (a) {
    var r = [];
    for (var i = 0; i < 30; i++) r.push($mod.FootBaller.$clone(a[i]));
    return r;
  };
  rtl.recNewT($mod,"FootBallTeam",function () {
    this.name = "";
    this.Mark = 0;
    this.tiredness = 0;
    this.mood = 0;
    this.$new = function () {
      var r = Object.create(this);
      r.footballers = rtl.arraySetLength(null,$mod.FootBaller,30);
      r.state = $mod.StateType.$new();
      r.stadiumteam = $mod.StadiumType.$new();
      return r;
    };
    this.$eq = function (b) {
      return (this.name === b.name) && rtl.arrayEq(this.footballers,b.footballers) && this.state.$eq(b.state) && (this.Mark === b.Mark) && (this.tiredness === b.tiredness) && (this.mood === b.mood) && this.stadiumteam.$eq(b.stadiumteam);
    };
    this.$assign = function (s) {
      this.name = s.name;
      this.footballers = $mod.FootballerArray$clone(s.footballers);
      this.state.$assign(s.state);
      this.Mark = s.Mark;
      this.tiredness = s.tiredness;
      this.mood = s.mood;
      this.stadiumteam.$assign(s.stadiumteam);
      return this;
    };
  });
  this.FootballteamArr1$clone = function (a) {
    var r = [];
    for (var i = 0; i < 2; i++) r.push($mod.FootBallTeam.$clone(a[i]));
    return r;
  };
  rtl.recNewT($mod,"MatchType",function () {
    this.OnLooker = 0;
    this.HalfEnd = 0;
    this.FileCom = "";
    this.$new = function () {
      var r = Object.create(this);
      r.Stadium = $mod.StadiumType.$new();
      r.Ft = rtl.arraySetLength(null,$mod.FootBallTeam,2);
      r.Score = rtl.arraySetLength(null,0,2);
      r.Date = $mod.DateType.$new();
      return r;
    };
    this.$eq = function (b) {
      return this.Stadium.$eq(b.Stadium) && rtl.arrayEq(this.Ft,b.Ft) && (this.OnLooker === b.OnLooker) && rtl.arrayEq(this.Score,b.Score) && (this.HalfEnd === b.HalfEnd) && this.Date.$eq(b.Date) && (this.FileCom === b.FileCom);
    };
    this.$assign = function (s) {
      this.Stadium.$assign(s.Stadium);
      this.Ft = $mod.FootballteamArr1$clone(s.Ft);
      this.OnLooker = s.OnLooker;
      this.Score = s.Score.slice(0);
      this.HalfEnd = s.HalfEnd;
      this.Date.$assign(s.Date);
      this.FileCom = s.FileCom;
      return this;
    };
  });
  var TTT = {"0": "g", g: 0, "1": "y", y: 1, "2": "r", r: 2, "3": "t", t: 3};
  var Thing = rtl.recNewT(null,"",function () {
    this.TT = 0;
    this.Min = 0;
    this.Surname = "";
    this.flag = false;
    this.StPlus = "";
    this.HT = 0;
    this.$eq = function (b) {
      return (this.TT === b.TT) && (this.Min === b.Min) && (this.Surname === b.Surname) && (this.flag === b.flag) && (this.StPlus === b.StPlus) && (this.HT === b.HT);
    };
    this.$assign = function (s) {
      this.TT = s.TT;
      this.Min = s.Min;
      this.Surname = s.Surname;
      this.flag = s.flag;
      this.StPlus = s.StPlus;
      this.HT = s.HT;
      return this;
    };
  });
  this.EmulMatch = async function (Match) {
    var MinNow = 0;
    var MinEnd = 0;
    var EStrength = 0;
    var ERandom = 0;
    var EMood = 0;
    var ETiredness = 0;
    var N = 0;
    var n0 = 0;
    var n1 = 0;
    var At = 0;
    var Pt = 0;
    var Half = 0;
    var TeamP = rtl.arraySetLength(null,0,2);
    var PlayerP = rtl.arraySetLength(null,0,2);
    var St = "";
    var St1 = "";
    var st2 = "";
    var st3 = "";
    var Player1 = $mod.FootBaller.$new();
    var Player2 = $mod.FootBaller.$new();
    var PlayerU = $mod.FootBaller.$new();
    var Things = rtl.arraySetLength(null,Thing,2,13);
    var i = 0;
    var j = 0;
    var SP = "";
    var flag = false;
    var InOut = rtl.arraySetLength(null,0,2);
    function MonthName(i) {
      var Result = "";
      var $tmp = i;
      if ($tmp === 1) {
        Result = pas.nls.Loc("January","січня")}
       else if ($tmp === 2) {
        Result = pas.nls.Loc("February","лютого")}
       else if ($tmp === 3) {
        Result = pas.nls.Loc("March","березня")}
       else if ($tmp === 4) {
        Result = pas.nls.Loc("April","квітня")}
       else if ($tmp === 5) {
        Result = pas.nls.Loc("May","травня")}
       else if ($tmp === 6) {
        Result = pas.nls.Loc("June","червня")}
       else if ($tmp === 7) {
        Result = pas.nls.Loc("July","липня")}
       else if ($tmp === 8) {
        Result = pas.nls.Loc("August","серпня")}
       else if ($tmp === 9) {
        Result = pas.nls.Loc("September","вересня")}
       else if ($tmp === 10) {
        Result = pas.nls.Loc("October","жовтня")}
       else if ($tmp === 11) {
        Result = pas.nls.Loc("November","листопада")}
       else if ($tmp === 12) {
        Result = pas.nls.Loc("December","грудня")}
       else {
        Result = "";
      };
      return Result;
    };
    function NewThing(i, a, b, stp) {
      var j = 0;
      var abc = false;
      j = 0;
      abc = false;
      do {
        j += 1;
        if (!Things[i - 1][j - 1].flag) {
          Things[i - 1][j - 1].flag = true;
          Things[i - 1][j - 1].TT = a;
          Things[i - 1][j - 1].Min = MinNow;
          Things[i - 1][j - 1].Surname = b;
          Things[i - 1][j - 1].StPlus = stp;
          Things[i - 1][j - 1].HT = Half;
          abc = true;
        };
      } while (!(abc || (j === 13)));
    };
    function DoTeamP() {
      var i = 0;
      var j = 0;
      for (i = 1; i <= 2; i++) {
        EStrength = Match.Ft[i - 1].Mark;
        ERandom = pas.System.Random(51) - 25;
        if (i === 1) ERandom = ERandom + 25;
        for (j = 1; j <= 11; j++) if (Match.Ft[i - 1].footballers[j - 1].play === false) ERandom -= 1;
        EMood = Match.Ft[i - 1].mood;
        ETiredness = Match.Ft[i - 1].tiredness;
        TeamP[i - 1] = EStrength + ERandom + EMood + ETiredness;
      };
    };
    function DoPlayerP() {
      EStrength = Player1.mark;
      ERandom = pas.System.Random(51) - 25;
      EMood = Player1.mood;
      ETiredness = Player1.tiredness;
      PlayerP[0] = EStrength + ERandom + EMood + ETiredness;
      EStrength = Player2.mark;
      ERandom = pas.System.Random(51) - 25;
      EMood = Player2.mood;
      ETiredness = Player2.tiredness;
      PlayerP[1] = EStrength + ERandom + EMood + ETiredness;
    };
    function ChAt() {
      var $tmp = At;
      if ($tmp === 1) {
        At = 2;
        Pt = 1;
      } else if ($tmp === 2) {
        At = 1;
        Pt = 2;
      };
    };
    function WriteMinNow() {
      var st1 = "";
      var st2 = "";
      var m = 0;
      st1 = "" + MinNow;
      if ((MinNow > 45) && (Half === 1)) {
        st2 = "" + (MinNow - 45);
        st1 = "45+" + st2;
      };
      if ((MinNow > 90) && (Half === 2)) {
        st2 = "" + (MinNow - 90);
        st1 = "90+" + st2;
      };
      if ((MinNow > 115) && (Half === 3)) {
        st2 = "" + (MinNow - 115);
        st1 = "115+" + st2;
      };
      if ((MinNow > 120) && (Half === 4)) {
        st2 = "" + (MinNow - 120);
        st1 = "120+" + st2;
      };
      if (Half !== 5) {
        St = st1 + pas.nls.Loc(" minute of the match"," хвилина матчу");
        m = St.length;
        pas.crt.GotoXY(40 - Math.floor(m / 2),9);
        pas.System.Write(St);
      } else {
        St = pas.nls.Loc("Penalty shootout","Серія пенальті");
        m = St.length;
        pas.crt.GotoXY(40 - Math.floor(m / 2),9);
        pas.System.Write(St);
      };
    };
    function WriteMinT(M0, H0) {
      var st1 = "";
      var st2 = "";
      st1 = "" + M0;
      if ((M0 > 45) && (H0 === 1)) {
        st2 = "" + (M0 - 45);
        st1 = "45+" + st2;
      };
      if ((M0 > 90) && (H0 === 2)) {
        st2 = "" + (M0 - 90);
        st1 = "90+" + st2;
      };
      if ((M0 > 115) && (H0 === 3)) {
        st2 = "" + (M0 - 115);
        st1 = "115+" + st2;
      };
      if ((M0 > 120) && (H0 === 4)) {
        st2 = "" + (M0 - 120);
        st1 = "120+" + st2;
      };
      if (H0 === 5) st1 = "''";
      St = st1 + "'";
      pas.System.Write(St);
    };
    async function Comment() {
      var i = 0;
      var j = 0;
      var m = 0;
      var m1 = 0;
      var m2 = 0;
      var st01 = "";
      var st02 = "";
      var dur = 0.0;
      pas.crt.ClrScr();
      st01 = Match.Ft[0].name + " (" + Match.Ft[0].state.name + ")";
      st02 = Match.Ft[1].name + " (" + Match.Ft[1].state.name + ")";
      m = st01.length;
      m = 35 - m;
      pas.crt.GotoXY(m,2);
      pas.System.Write(st01);
      m = m + Math.floor(st01.length / 2);
      pas.crt.GotoXY(m,4);
      pas.System.Write(Match.Score[0]);
      m = 45;
      pas.crt.GotoXY(m,2);
      pas.System.Write(st02);
      pas.crt.GotoXY(m + Math.floor(st02.length / 2),4);
      pas.System.Write(Match.Score[1]);
      m = St.length;
      pas.crt.GotoXY(40 - Math.floor(m / 2),7);
      pas.System.Write(St);
      var $tmp = m;
      if (($tmp >= 1) && ($tmp <= 10)) {
        dur = 0.75}
       else if (($tmp >= 11) && ($tmp <= 20)) {
        dur = 0.85}
       else if (($tmp >= 21) && ($tmp <= 40)) {
        dur = 0.95}
       else {
        dur = 1;
      };
      WriteMinNow();
      m1 = 35 - st01.length;
      m2 = 45;
      for (i = 1; i <= 2; i++) for (j = 1; j <= 13; j++) {
        if (Things[i - 1][j - 1].flag) {
          var $tmp1 = i;
          if ($tmp1 === 1) {
            var $tmp2 = Things[i - 1][j - 1].TT;
            if ($tmp2 === TTT.g) {
              pas.crt.GotoXY(m1,9 + j);
              pas.System.Write("\t"," ");
            } else if ($tmp2 === TTT.y) {
              pas.crt.GotoXY(m1,9 + j);
              pas.crt.TextBackground(14);
              pas.System.Write(" ");
              pas.crt.TextBackground(0);
              pas.System.Write(" ");
            } else if ($tmp2 === TTT.r) {
              pas.crt.GotoXY(m1,9 + j);
              pas.crt.TextBackground(4);
              pas.System.Write(" ");
              pas.crt.TextBackground(0);
              pas.System.Write(" ");
            } else if ($tmp2 === TTT.t) {
              pas.crt.GotoXY(m1,9 + j);
              pas.crt.TextColor(4);
              pas.System.Write("+ ");
              pas.crt.TextColor(15);
            };
            WriteMinT(Things[i - 1][j - 1].Min,Things[i - 1][j - 1].HT);
            pas.System.Write(" ",Things[i - 1][j - 1].Surname," ",Things[i - 1][j - 1].StPlus);
          } else if ($tmp1 === 2) {
            var $tmp3 = Things[i - 1][j - 1].TT;
            if ($tmp3 === TTT.g) {
              pas.crt.GotoXY(m2,9 + j);
              pas.System.Write("\t"," ");
            } else if ($tmp3 === TTT.y) {
              pas.crt.GotoXY(m2,9 + j);
              pas.crt.TextBackground(14);
              pas.System.Write(" ");
              pas.crt.TextBackground(0);
              pas.System.Write(" ");
            } else if ($tmp3 === TTT.r) {
              pas.crt.GotoXY(m2,9 + j);
              pas.crt.TextBackground(4);
              pas.System.Write(" ");
              pas.crt.TextBackground(0);
              pas.System.Write(" ");
            } else if ($tmp3 === TTT.t) {
              pas.crt.GotoXY(m2,9 + j);
              pas.crt.TextColor(4);
              pas.System.Write("+ ");
              pas.crt.TextColor(15);
            };
            WriteMinT(Things[i - 1][j - 1].Min,Things[i - 1][j - 1].HT);
            pas.System.Write(" ",Things[i - 1][j - 1].Surname," ",Things[i - 1][j - 1].StPlus);
          };
        };
      };
      await pas.crt.Delay(Math.round(dur * 1000));
    };
    async function Sostav() {
      var i = 0;
      var j = 0;
      var y = 0;
      var k = 0;
      var x1 = 0;
      var x2 = 0;
      pas.crt.GotoXY(1,10);
      for (i = 10; i <= 24; i++) pas.System.Write("                                                           ");
      x1 = (Match.Ft[0].name + " (" + Match.Ft[0].state.name + ")").length;
      x2 = (Match.Ft[1].name + " (" + Match.Ft[1].state.name + ")").length;
      x1 = Math.floor((30 - x1) / 2) + 1;
      x2 = Math.floor((30 - x2) / 2) + 51;
      for (i = 1; i <= 12; i++) {
        await pas.crt.Delay(Math.round(1.5 * 1000));
        pas.crt.GotoXY(x1,13);
        pas.System.Write("                                              ");
        pas.crt.GotoXY(x2,13);
        pas.System.Write("                                              ");
        pas.crt.GotoXY(x1,13);
        pas.System.Write(Match.Ft[0].name," (",Match.Ft[0].state.name,")");
        pas.crt.GotoXY(x2,13);
        pas.System.Write(Match.Ft[1].name," (" + Match.Ft[1].state.name,")");
        for (var $l = 1, $end = i; $l <= $end; $l++) {
          j = $l;
          for (k = 1; k <= 2; k++) {
            y = j + 13;
            var $tmp = k;
            if ($tmp === 1) {
              pas.crt.GotoXY(1,y)}
             else if ($tmp === 2) pas.crt.GotoXY(50,y);
            var $tmp1 = Match.Ft[k - 1].footballers[j - 1].fall;
            if ($tmp1 === $mod.FallType.YellowCard) {
              pas.crt.TextBackground(14);
              pas.System.Write(" ");
              pas.crt.TextBackground(0);
            } else if ($tmp1 === $mod.FallType.RedCard) {
              pas.crt.TextBackground(4);
              pas.System.Write(" ");
              pas.crt.TextBackground(0);
            } else {
              pas.System.Write(" ");
            };
            pas.System.Write(" № ",Match.Ft[k - 1].footballers[j - 1].number," ",Match.Ft[k - 1].footballers[j - 1].name," " + Match.Ft[k - 1].footballers[j - 1].surname);
          };
        };
      };
    };
    async function HelpPr2() {
      var st001 = "";
      var st002 = "";
      St1 = "" + Match.Stadium.Seats;
      St = pas.nls.Loc("We welcome you back to the ","Ми знову вітаємо вас на стадіоні ") + Match.Stadium.name + " (" + St1 + pas.nls.Loc(" seats)"," місць)");
      await Comment();
      St1 = "" + Match.Date.date;
      st2 = MonthName(Match.Date.month);
      st3 = "" + Match.Date.year;
      St = pas.nls.Loc("Today is ","Сьогодні ") + St1 + " " + st2 + " " + st3 + pas.nls.Loc(""," року");
      await Comment();
      St1 = "" + Match.OnLooker;
      St = St1 + pas.nls.Loc(" spectators have gathered at the stadium to watch this match"," глядачів зібралися на стадіоні, щоб подивитися цей матч");
      await Comment();
      St = pas.nls.Loc("Playing:","Грають:");
      await Comment();
      St = Match.Ft[0].name + " (" + Match.Ft[0].state.name + ")";
      await Comment();
      St = pas.nls.Loc("VERSUS","ПРОТИ");
      await Comment();
      St = Match.Ft[1].name + " (" + Match.Ft[1].state.name + ")";
      await Comment();
      St = pas.nls.Loc("Line-ups","Склади команд");
      await Comment();
      await Sostav();
      n0 = pas.System.Random(100);
      var $tmp = n0;
      if (($tmp >= 0) && ($tmp <= 10)) {
        st3 = pas.nls.Loc("Snowing","Іде сніг")}
       else if (($tmp >= 11) && ($tmp <= 30)) {
        st3 = pas.nls.Loc("Raining","Іде дощ")}
       else if (($tmp >= 31) && ($tmp <= 60)) {
        st3 = pas.nls.Loc("Overcast","Хмарно")}
       else {
        st3 = pas.nls.Loc("Sunny","Сонячно");
      };
      St = pas.nls.Loc("Weather on the pitch:","Погода на полі:");
      await Comment();
      St = st3;
      await Comment();
      st3 = "" + (Half - 1);
      st001 = "" + Match.Score[0];
      st002 = "" + Match.Score[1];
      St = pas.nls.Loc("A reminder, the score after ","Нагадуємо, рахунок після ") + st3 + pas.nls.Loc(" half - "," тайму - ") + st001 + ":" + st002;
      await Comment();
      St = pas.nls.Loc("The teams are ready for the next half. The referee whistles and ... ","Що ж, команди готові почати наступний тайм. Суддя дає свисток і ... ");
      await Comment();
      St = "";
      await Comment();
    };
    async function HelpPr3() {
      var st001 = "";
      var st002 = "";
      St = "" + Half;
      st001 = "" + Match.Score[0];
      st002 = "" + Match.Score[1];
      St = pas.nls.Loc("So, ","Отже, ") + St + pas.nls.Loc(" half is over and the score is - "," тайм завершено, рахунок - ") + st001 + ":" + st002;
      await Comment();
    };
    async function HelpPr4() {
      var st001 = "";
      var st002 = "";
      st001 = "" + Match.Score[0];
      st002 = "" + Match.Score[1];
      St = pas.nls.Loc("So, the match is over and the score is - ","Отже, матч завершено, рахунок - ") + st001 + ":" + st002;
      await Comment();
    };
    async function HelpPr1() {
      St1 = "" + Match.Stadium.Seats;
      St = pas.nls.Loc("We welcome you to the ","Ми вітаємо вас на стадіоні ") + Match.Stadium.name + " (" + St1 + pas.nls.Loc(" seats)"," місць)");
      await Comment();
      St1 = "" + Match.Date.date;
      st2 = MonthName(Match.Date.month);
      st3 = "" + Match.Date.year;
      St = pas.nls.Loc("Today is ","Сьогодні ") + St1 + " " + st2 + " " + st3 + pas.nls.Loc(""," року");
      await Comment();
      St1 = "" + Match.OnLooker;
      St = St1 + pas.nls.Loc(" spectators have gathered at the stadium to watch this match"," глядачів зібралися на стадіоні, щоб подивитися цей матч");
      await Comment();
      St = pas.nls.Loc("Playing:","Грають:");
      await Comment();
      St = Match.Ft[0].name + " (" + Match.Ft[0].state.name + ")";
      await Comment();
      St = pas.nls.Loc("VERSUS","ПРОТИ");
      await Comment();
      St = Match.Ft[1].name + " (" + Match.Ft[1].state.name + ")";
      await Comment();
      St = pas.nls.Loc("Line-ups","Склади команд");
      await Comment();
      await Sostav();
      n0 = pas.System.Random(100);
      var $tmp = n0;
      if (($tmp >= 0) && ($tmp <= 10)) {
        st3 = pas.nls.Loc("Snowing","Іде сніг")}
       else if (($tmp >= 11) && ($tmp <= 30)) {
        st3 = pas.nls.Loc("Raining","Іде дощ")}
       else if (($tmp >= 31) && ($tmp <= 60)) {
        st3 = pas.nls.Loc("Overcast","Хмарно")}
       else {
        st3 = pas.nls.Loc("Sunny","Сонячно");
      };
      St = pas.nls.Loc("Weather on the pitch:","Погода на полі:");
      await Comment();
      St = st3;
      await Comment();
      St = pas.nls.Loc("The teams are ready to start. The referee whistles and ... ","Що ж, команди готові почати матч. Суддя дає свисток і ... ");
      await Comment();
      St = "";
      await Comment();
    };
    async function HelpPr7(t, p1, p2) {
      var m = 0;
      if (t === 0) t = pas.System.Random(2) + 1;
      if (p1 === 0) p1 = pas.System.Random(10) + 2;
      if (p2 === 0) p2 = pas.System.Random(4) + 12;
      St = pas.nls.Loc("In the ","У команді ") + Match.Ft[t - 1].name + pas.nls.Loc(" squad, a substitution:"," заміна:");
      await Comment();
      St = "";
      await Comment();
      St = "\x19" + " " + Match.Ft[t - 1].footballers[p1 - 1].name + " " + Match.Ft[t - 1].footballers[p1 - 1].surname;
      m = St.length;
      pas.crt.GotoXY(40 - Math.floor(m / 2),7);
      pas.crt.TextColor(4);
      pas.System.Write("\x19");
      pas.crt.TextColor(15);
      pas.System.Write(" " + Match.Ft[t - 1].footballers[p1 - 1].name + " " + Match.Ft[t - 1].footballers[p1 - 1].surname);
      await pas.crt.Delay(Math.round(1 * 1000));
      St = "";
      await Comment();
      St = "\x18" + " " + Match.Ft[t - 1].footballers[p2 - 1].name + " " + Match.Ft[t - 1].footballers[p2 - 1].surname;
      m = St.length;
      pas.crt.GotoXY(40 - Math.floor(m / 2),7);
      pas.crt.TextColor(2);
      pas.System.Write("\x18");
      pas.crt.TextColor(15);
      pas.System.Write(" " + Match.Ft[t - 1].footballers[p2 - 1].name + " " + Match.Ft[t - 1].footballers[p2 - 1].surname);
      await pas.crt.Delay(Math.round(1 * 1000));
      Player1.$assign(Match.Ft[t - 1].footballers[p2 - 1]);
      Match.Ft[t - 1].footballers[p2 - 1].$assign(Match.Ft[t - 1].footballers[p1 - 1]);
      Match.Ft[t - 1].footballers[p1 - 1].$assign(Player1);
      Match.Ft[t - 1].footballers[p2 - 1].here = false;
      Match.Ft[t - 1].footballers[p1 - 1].play = true;
      InOut[t - 1] -= 1;
    };
    async function HelpPr8(nt) {
      var p1 = 0;
      do {
        p1 = pas.System.Random(10) + 2;
        Player1.$assign(Match.Ft[nt - 1].footballers[p1 - 1]);
      } while (!Player1.play);
      St = pas.nls.Loc("In the ","У команді ") + Match.Ft[nt - 1].name + pas.nls.Loc(" is injured "," травмований ") + Player1.name + " " + Player1.surname;
      NewThing(nt,TTT.t,Player1.surname,"");
      await Comment();
      await HelpPr7(nt,p1,0);
    };
    async function EPr1() {
      St = pas.nls.Loc("Team ","Команда ") + Match.Ft[At - 1].name + pas.nls.Loc(" kicks off"," розігрує мʼяч");
      await Comment();
      n0 = pas.System.Random(100) + 1;
      var $tmp = n0;
      if (($tmp >= 1) && ($tmp <= 50)) {
        N = 2}
       else {
        N = 3;
      };
    };
    async function EPr2() {
      St = Match.Ft[At - 1].name + pas.nls.Loc(" knocks it around"," розпасовується");
      MinNow += 1;
      await Comment();
      n0 = (pas.System.Random(50) + TeamP[At - 1]) - TeamP[Pt - 1];
      var $tmp = n0;
      if (($tmp >= 0) && ($tmp <= 25)) {
        N = 4}
       else if (($tmp >= 26) && ($tmp <= 50)) {
        N = 3}
       else {
        N = 2;
      };
    };
    async function EPr3() {
      var n00 = 0;
      MinNow += 1;
      St = Match.Ft[At - 1].name + pas.nls.Loc(" starts an attack"," починає свою атаку");
      await Comment();
      n0 = pas.System.Random(50);
      n00 = (n0 + TeamP[At - 1]) - TeamP[Pt - 1];
      if (n00 <= 25) {
        N = 4}
       else {
        var $tmp = n0;
        if (($tmp >= 0) && ($tmp <= 10)) {
          N = 2}
         else if (($tmp >= 11) && ($tmp <= 25)) {
          N = 5}
         else {
          N = 6;
        };
      };
    };
    async function EPr4() {
      MinNow += 1;
      St = Match.Ft[Pt - 1].name + pas.nls.Loc(" intercepts the ball"," перехоплює мʼяч");
      await Comment();
      n0 = pas.System.Random(100);
      var $tmp = n0;
      if (($tmp >= 0) && ($tmp <= 30)) {
        N = 22}
       else if (($tmp >= 31) && ($tmp <= 50)) {
        N = 2}
       else {
        N = 3;
      };
      if (N !== 22) ChAt();
    };
    async function EPr5() {
      var n00 = 0;
      MinNow += 1;
      do {
        n0 = pas.System.Random(10) + 2;
        Player1.$assign(Match.Ft[At - 1].footballers[n0 - 1]);
      } while (!(Player1.play === true));
      St = Player1.name + " " + Player1.surname + pas.nls.Loc(" goes past on his own"," проходить сам");
      await Comment();
      DoPlayerP();
      n00 = Math.floor(((PlayerP[0] + pas.System.Random(51)) - 25) / 10);
      if (n00 < 2) {
        N = 4}
       else {
        n0 = pas.System.Random(100);
        var $tmp = n0;
        if (($tmp >= 0) && ($tmp <= 15)) {
          N = 2}
         else if (($tmp >= 16) && ($tmp <= 45)) {
          N = 6}
         else if (($tmp >= 46) && ($tmp <= 65)) {
          N = 8}
         else {
          N = 7;
        };
      };
    };
    async function EPr6() {
      var n00 = 0;
      MinNow += 1;
      do {
        n0 = pas.System.Random(10) + 2;
        Player2.$assign(Match.Ft[At - 1].footballers[n0 - 1]);
      } while (!(Player2.play === true));
      DoPlayerP();
      n00 = Math.floor(((PlayerP[1] + pas.System.Random(51)) - 25) / 10);
      n0 = pas.System.Random(100) + 1;
      var $tmp = n0;
      if (($tmp >= 1) && ($tmp <= 25)) {
        St = pas.nls.Loc("A pass to ","Пас на ") + Player2.surname;
        await Comment();
        if (n00 < 2) {
          N = 4}
         else {
          n0 = pas.System.Random(100);
          var $tmp1 = n0;
          if (($tmp1 >= 0) && ($tmp1 <= 15)) {
            N = 2}
           else if (($tmp1 >= 16) && ($tmp1 <= 45)) {
            N = 6}
           else if (($tmp1 >= 46) && ($tmp1 <= 65)) {
            N = 8}
           else {
            N = 7;
          };
        };
      } else if (($tmp >= 26) && ($tmp <= 50)) {
        St = Player2.surname + pas.nls.Loc(" swings it in"," навішує");
        await Comment();
        if (n00 < 2) {
          N = 4}
         else N = 8;
      } else if (($tmp >= 51) && ($tmp <= 75)) {
        St = Player2.surname + pas.nls.Loc(" drills it into the box"," прострілює у штрафний майданчик");
        await Comment();
        if (n00 < 2) {
          N = 4}
         else N = 8;
      } else {
        N = 24;
      };
    };
    function EPr7() {
      n0 = pas.System.Random(100) + 1;
      var $tmp = n0;
      if (($tmp >= 1) && ($tmp <= 50)) {
        N = 9}
       else {
        N = 22;
      };
    };
    async function EPr8() {
      do {
        n0 = pas.System.Random(10) + 2;
        Player1.$assign(Match.Ft[At - 1].footballers[n0 - 1]);
      } while (!(Player1.play === true));
      PlayerU.$assign(Player1);
      MinNow += 1;
      St = Player1.surname + pas.nls.Loc(" shoots!"," бʼє!");
      await Comment();
      DoPlayerP();
      n0 = pas.System.Random(50) + PlayerP[0];
      var $tmp = n0;
      if ((($tmp >= 0) && ($tmp <= 65)) || (($tmp >= 125) && ($tmp <= 135))) {
        N = 12}
       else if (($tmp >= 66) && ($tmp <= 124)) {
        N = 13}
       else {
        N = 11;
      };
    };
    async function Epr9() {
      n0 = pas.System.Random(100);
      if (n0 < 25) await HelpPr8(Pt);
      n0 = pas.System.Random(100);
      do {
        n1 = pas.System.Random(10) + 2;
        Player1.$assign(Match.Ft[At - 1].footballers[n1 - 1]);
      } while (!(Player1.play === true));
      var $tmp = n0;
      if (($tmp >= 0) && ($tmp <= 30)) {
        n0 = pas.System.Random(100);
        var $tmp1 = n0;
        if (($tmp1 >= 0) && ($tmp1 <= 80)) {
          St = Player1.surname + pas.nls.Loc(" commits a foul and gets a yellow card"," порушує правила й отримує жовту картку");
          NewThing(At,TTT.y,Player1.surname,"");
          await Comment();
          if (Player1.fall === $mod.FallType.YellowCard) {
            Match.Ft[At - 1].footballers[n1 - 1].fall = $mod.FallType.RedCard;
            Match.Ft[At - 1].footballers[n1 - 1].play = false;
            St = Player1.surname + pas.nls.Loc(" fouls again, earns a second yellow and walks off the pitch"," знову фолить, заробляє другу жовту картку й залишає поле");
            NewThing(At,TTT.r,Player1.surname,"");
            await Comment();
          };
          Match.Ft[At - 1].footballers[n1 - 1].fall = $mod.FallType.YellowCard;
        } else {
          Match.Ft[At - 1].footballers[n1 - 1].fall = $mod.FallType.RedCard;
          Match.Ft[At - 1].footballers[n1 - 1].play = false;
          NewThing(At,TTT.r,Player1.surname,"");
          St = Player1.surname + pas.nls.Loc(" fouls brutally, earns a red card and walks off the pitch"," жорстоко фолить, заробляє червону картку й залишає поле");
          await Comment();
        };
      } else {
        St = Player1.surname + pas.nls.Loc(" fouls while being taken on"," порушує правила під час проходу");
        await Comment();
      };
      ChAt();
      MinNow += 1;
      St = Match.Ft[At - 1].name + pas.nls.Loc(" takes a free kick from his own half"," бʼє штрафний зі своєї половини поля");
      await Comment();
      n0 = pas.System.Random(100);
      var $tmp2 = n0;
      if (($tmp2 >= 0) && ($tmp2 <= 50)) {
        N = 2}
       else {
        N = 3;
      };
    };
    async function EPr10() {
      do {
        n0 = pas.System.Random(10) + 2;
        Player1.$assign(Match.Ft[At - 1].footballers[n0 - 1]);
      } while (!(Player1.play === true));
      PlayerU.$assign(Player1);
      MinNow += 1;
      St = Player1.surname + pas.nls.Loc(" takes a free kick"," бʼє штрафний");
      await Comment();
      St = pas.nls.Loc("A SHOT!!!","УДАР!!!");
      await Comment();
      DoPlayerP();
      n0 = pas.System.Random(50) + PlayerP[0];
      var $tmp = n0;
      if (($tmp >= 0) && ($tmp <= 75)) {
        N = 12}
       else if (($tmp >= 76) && ($tmp <= 150)) {
        N = 13}
       else {
        N = 11;
      };
    };
    async function EPr11() {
      St = pas.nls.Loc("The ball hits a player","Мʼяч влучає в гравця");
      MinNow += 1;
      await Comment();
      n0 = pas.System.Random(100) + 1;
      var $tmp = n0;
      if (($tmp >= 1) && ($tmp <= 50)) {
        N = 14}
       else if (($tmp >= 51) && ($tmp <= 100)) N = 18;
    };
    async function Epr12() {
      St = pas.nls.Loc("WIDE! So dangerous, and yet ... wide!","ПОВЗ ВОРОТА! Як же було небезпечно, але ... повз!");
      MinNow += 1;
      await Comment();
      ChAt();
      N = 16;
    };
    async function EPr13() {
      var n00 = 0;
      St = pas.nls.Loc("DANGEROUS!!!","НЕБЕЗПЕЧНО!!!");
      await Comment();
      Player1.$assign(PlayerU);
      Player2.$assign(Match.Ft[At - 1].footballers[0]);
      DoPlayerP();
      n00 = (pas.System.Random(50) + PlayerP[0]) - PlayerP[1];
      n0 = pas.System.Random(50) + PlayerP[0];
      if (n00 < 25) {
        N = 20}
       else {
        var $tmp = n0;
        if (($tmp >= 26) && ($tmp <= 100)) {
          N = 21}
         else {
          N = 19;
        };
      };
    };
    async function EPr14() {
      St = pas.nls.Loc("The ball has gone out of play","Мʼяч вийшов за межі поля");
      await Comment();
      n0 = pas.System.Random(100);
      var $tmp = n0;
      if (($tmp >= 25) && ($tmp <= 50)) {
        if (InOut[0] !== 0) await HelpPr7(1,0,0)}
       else if (($tmp >= 51) && ($tmp <= 75)) if (InOut[1] !== 0) await HelpPr7(2,0,0);
      n0 = pas.System.Random(100) + 1;
      var $tmp1 = n0;
      if (($tmp1 >= 1) && ($tmp1 <= 50)) {
        N = 141}
       else {
        N = 142;
      };
    };
    async function EPr141() {
      St = pas.nls.Loc("The ball goes out off ","Мʼяч виходить від гравців ") + Match.Ft[At - 1].name;
      await Comment();
      ChAt();
      n0 = pas.System.Random(100) + 1;
      var $tmp = n0;
      if (($tmp >= 1) && ($tmp <= 50)) {
        N = 15}
       else {
        N = 16;
      };
    };
    async function EPr142() {
      St = pas.nls.Loc("The ball goes out off ","Мʼяч виходить від гравців ") + Match.Ft[Pt - 1].name;
      await Comment();
      n0 = pas.System.Random(100) + 1;
      var $tmp = n0;
      if (($tmp >= 1) && ($tmp <= 50)) {
        N = 15}
       else {
        N = 17;
      };
    };
    async function EPr15() {
      var np1 = 0;
      var np2 = 0;
      var n00 = 0;
      MinNow += 1;
      St = pas.nls.Loc("That's a throw-in","Це аут");
      await Comment();
      do {
        np1 = pas.System.Random(10) + 2;
        np2 = pas.System.Random(10) + 2;
        Player1.$assign(Match.Ft[At - 1].footballers[np1 - 1]);
        Player2.$assign(Match.Ft[At - 1].footballers[np2 - 1]);
      } while (!((np1 !== np2) && Player1.play && Player2.play));
      St = Player1.name + " " + Player1.surname + pas.nls.Loc(" throws the ball to "," викидає мʼяч на ") + Player2.surname;
      await Comment();
      DoPlayerP();
      n00 = pas.System.Random(50) + PlayerP[1];
      n0 = pas.System.Random(100);
      if (n00 < 25) {
        N = 4}
       else {
        var $tmp = n0;
        if (($tmp >= 0) && ($tmp <= 50)) {
          N = 2}
         else {
          N = 3;
        };
      };
    };
    async function EPr16() {
      var n00 = 0;
      Player1.$assign(Match.Ft[At - 1].footballers[0]);
      St = Player1.name + " " + Player1.surname + pas.nls.Loc(" takes the goal kick"," вибиває мʼяч від воріт");
      await Comment();
      DoPlayerP();
      n00 = pas.System.Random(50) + PlayerP[0];
      n0 = pas.System.Random(100);
      if (n00 < 25) {
        N = 4}
       else {
        var $tmp = n0;
        if (($tmp >= 0) && ($tmp <= 50)) {
          N = 2}
         else {
          N = 3;
        };
      };
    };
    async function EPr17() {
      var n00 = 0;
      do {
        n0 = pas.System.Random(10) + 2;
        Player1.$assign(Match.Ft[At - 1].footballers[n0 - 1]);
      } while (!Player1.play);
      MinNow += 1;
      St = pas.nls.Loc("That's a corner","Це кутовий");
      await Comment();
      St = Player1.name + " " + Player1.surname + pas.nls.Loc(" swings it in"," навішує");
      await Comment();
      DoPlayerP();
      n00 = pas.System.Random(50) + PlayerP[0];
      if (n00 < 25) {
        N = 4}
       else N = 8;
    };
    async function EPr18() {
      St = pas.nls.Loc("The ball stays in play","Мʼяч залишається у грі");
      await Comment();
      n0 = pas.System.Random(100);
      var $tmp = n0;
      if (($tmp >= 0) && ($tmp <= 31)) {
        N = 2}
       else if (($tmp >= 32) && ($tmp <= 63)) {
        N = 3}
       else if (($tmp >= 64) && ($tmp <= 94)) {
        N = 4}
       else {
        N = 25;
      };
    };
    async function EPr19() {
      n0 = pas.System.Random(100);
      var $tmp = n0;
      if (($tmp >= 0) && ($tmp <= 50)) {
        St = pas.nls.Loc("Off the post!","Штанга!")}
       else if (($tmp >= 51) && ($tmp <= 90)) {
        St = pas.nls.Loc("Off the bar!","Перекладина!")}
       else {
        St = pas.nls.Loc("Off the angle!","Хрестовина!");
      };
      await Comment();
      n0 = pas.System.Random(100);
      var $tmp1 = n0;
      if (($tmp1 >= 0) && ($tmp1 <= 25)) {
        N = 21}
       else if (($tmp1 >= 26) && ($tmp1 <= 40)) {
        N = 141}
       else if (($tmp1 >= 41) && ($tmp1 <= 65)) {
        N = 2}
       else if (($tmp1 >= 66) && ($tmp1 <= 80)) {
        N = 3}
       else {
        N = 4;
      };
    };
    async function EPr20() {
      MinNow += 1;
      n0 = pas.System.Random(100);
      var $tmp = n0;
      if (($tmp >= 0) && ($tmp <= 50)) {
        St = pas.nls.Loc("The keeper gathers it in his hands!","Воротар бере мʼяч у руки!");
        await Comment();
        ChAt();
        N = 16;
      } else {
        n0 = pas.System.Random(100);
        var $tmp1 = n0;
        if (($tmp1 >= 0) && ($tmp1 <= 50)) {
          St = pas.nls.Loc("The keeper tips it out for a corner!","Воротар відбиває мʼяч на кутовий!");
          await Comment();
          N = 17;
        };
        if (n0 > 50) {
          St = pas.nls.Loc("The keeper parries it in front of himself","Воротар відбиває мʼяч перед собою");
          await Comment();
          St = pas.nls.Loc("Players rush in for the rebound!","Гравці біжать на добивання!");
          await Comment();
          St = pas.nls.Loc("THIS IS VERY DANGEROUS!!!","ЦЕ ДУЖЕ НЕБЕЗПЕЧНО!!!");
          await Comment();
          do {
            n0 = pas.System.Random(10) + 2;
            PlayerU.$assign(Match.Ft[At - 1].footballers[n0 - 1]);
          } while (!PlayerU.play);
          n0 = pas.System.Random(100);
          var $tmp2 = n0;
          if (($tmp2 >= 0) && ($tmp2 <= 50)) {
            N = 21}
           else {
            N = 4;
          };
        };
      };
    };
    async function EPr21() {
      St = pas.nls.Loc("GOAL!!!","ГОЛ!!!");
      await Comment();
      St = pas.nls.Loc("GOAL!!!","ГОЛ!!!");
      await Comment();
      St = pas.nls.Loc("GOAL!!!","ГОЛ!!!");
      await Comment();
      St = PlayerU.name + " " + PlayerU.surname + pas.nls.Loc(" scores it!!!"," забиває цей гол!!!");
      NewThing(At,TTT.g,PlayerU.surname,SP);
      Match.Score[At - 1] += 1;
      SP = "";
      await Comment();
      ChAt();
      N = 1;
    };
    async function Epr22() {
      n0 = pas.System.Random(100);
      if (n0 < 25) await HelpPr8(At);
      n0 = pas.System.Random(100);
      do {
        n1 = pas.System.Random(10) + 2;
        Player1.$assign(Match.Ft[Pt - 1].footballers[n1 - 1]);
      } while (!(Player1.play === true));
      var $tmp = n0;
      if (($tmp >= 0) && ($tmp <= 30)) {
        n0 = pas.System.Random(100);
        var $tmp1 = n0;
        if (($tmp1 >= 0) && ($tmp1 <= 80)) {
          St = Player1.surname + pas.nls.Loc(" commits a foul and gets a yellow card"," порушує правила й отримує жовту картку");
          NewThing(Pt,TTT.y,Player1.surname,"");
          await Comment();
          if (Player1.fall === $mod.FallType.YellowCard) {
            Match.Ft[Pt - 1].footballers[n1 - 1].fall = $mod.FallType.RedCard;
            Match.Ft[Pt - 1].footballers[n1 - 1].play = false;
            St = Player1.surname + pas.nls.Loc(" fouls again, earns a second yellow and walks off the pitch"," знову фолить, заробляє другу жовту картку й залишає поле");
            NewThing(Pt,TTT.r,Player1.surname,"");
            await Comment();
          };
          Match.Ft[Pt - 1].footballers[n1 - 1].fall = $mod.FallType.YellowCard;
        } else {
          Match.Ft[Pt - 1].footballers[n1 - 1].fall = $mod.FallType.RedCard;
          Match.Ft[Pt - 1].footballers[n1 - 1].play = false;
          NewThing(Pt,TTT.r,Player1.surname,"");
          St = Player1.surname + pas.nls.Loc(" fouls brutally, earns a red card and walks off the pitch"," жорстоко фолить, заробляє червону картку й залишає поле");
          await Comment();
        };
      } else {
        St = Player1.surname + pas.nls.Loc(" fouls while tackling an opponent"," порушує правила під час відбору мʼяча");
        await Comment();
      };
      MinNow += 1;
      n0 = pas.System.Random(100);
      var $tmp2 = n0;
      if (($tmp2 >= 0) && ($tmp2 <= 85)) {
        N = 10}
       else {
        N = 23;
      };
    };
    async function EPr23() {
      MinNow += 1;
      St = pas.nls.Loc("The referee points to the spot","Суддя вказує на «точку»");
      await Comment();
      St = pas.nls.Loc("Team ","Команді ") + Match.Ft[At - 1].name + pas.nls.Loc(" has been awarded a penalty!!!"," надається можливість пробити пенальті!!!");
      await Comment();
      SP = pas.nls.Loc("p","п");
      n0 = 11;
      do {
        PlayerU.$assign(Match.Ft[At - 1].footballers[n0 - 1]);
        n0 -= 1;
      } while (!PlayerU.play);
      St = pas.nls.Loc("Stepping up to the ball is ","До мʼяча підходить ") + PlayerU.name + " " + PlayerU.surname;
      await Comment();
      St = pas.nls.Loc("He shoots!!!","Він бʼє!!!");
      await Comment();
      n0 = pas.System.Random(100) + 1;
      var $tmp = n0;
      if (($tmp >= 0) && ($tmp <= 75)) {
        St = pas.nls.Loc("Keeper and ball fly into opposite corners!","Воротар і мʼяч розлітаються в різні кути!");
        await Comment();
        N = 21;
      } else if (($tmp >= 76) && ($tmp <= 90)) {
        St = pas.nls.Loc("The keeper saves it!!!","Воротар ловить цей мʼяч!!!");
        await Comment();
        ChAt();
        N = 16;
      } else {
        N = 12;
      };
    };
    async function EPr24() {
      var n1 = 0;
      MinNow += 1;
      St = pas.nls.Loc("A stunning pass!","Приголомшливий пас!");
      await Comment();
      do {
        n0 = pas.System.Random(10) + 2;
        PlayerU.$assign(Match.Ft[At - 1].footballers[n0 - 1]);
      } while (!(PlayerU.play === true));
      Player2.$assign(Match.Ft[Pt - 1].footballers[0]);
      St = PlayerU.name + " " + PlayerU.surname + pas.nls.Loc(" is through one on one with "," виходить сам на сам з ") + Player2.name + " " + Player2.surname;
      await Comment();
      n0 = pas.System.Random(100) + 1;
      n1 = pas.System.Random(100) + 1;
      var $tmp = n0;
      if (($tmp >= 1) && ($tmp <= 25)) {
        St = pas.nls.Loc("He shoots!!!","Він бʼє!!!");
        await Comment();
        var $tmp1 = n1;
        if (($tmp1 >= 1) && ($tmp1 <= 60)) {
          N = 21}
         else if (($tmp1 >= 61) && ($tmp1 <= 75)) {
          N = 20}
         else if (($tmp1 >= 76) && ($tmp1 <= 85)) {
          N = 19}
         else {
          N = 12;
        };
      } else if (($tmp >= 26) && ($tmp <= 50)) {
        St = pas.nls.Loc("He goes to dribble round the keeper!!!","Він іде обігравати воротаря!!!");
        await Comment();
        var $tmp2 = n1;
        if (($tmp2 >= 1) && ($tmp2 <= 75)) {
          N = 21}
         else if (($tmp2 >= 76) && ($tmp2 <= 80)) {
          N = 12}
         else {
          ChAt();
          N = 16;
        };
      } else if (($tmp >= 51) && ($tmp <= 75)) {
        do {
          n0 = pas.System.Random(10) + 2;
          PlayerU.$assign(Match.Ft[At - 1].footballers[n0 - 1]);
        } while (!(PlayerU.play === true));
        St = pas.nls.Loc("A pass past the keeper to ","Пас повз воротаря на ") + PlayerU.surname;
        await Comment();
        var $tmp3 = n1;
        if (($tmp3 >= 1) && ($tmp3 <= 75)) {
          N = 21}
         else if (($tmp3 >= 76) && ($tmp3 <= 85)) {
          N = 12}
         else if (($tmp3 >= 86) && ($tmp3 <= 90)) {
          N = 19}
         else {
          ChAt();
          N = 16;
        };
      } else {
        St = pas.nls.Loc("Unheard-of courage!!!","Нечувана сміливість!!!");
        await Comment();
        do {
          n1 = pas.System.Random(10) + 2;
          Player2.$assign(Match.Ft[Pt - 1].footballers[n1 - 1]);
        } while (!(Player2.play === true));
        St = Player2.name + " " + Player2.surname + pas.nls.Loc(" fouls "," фолить на ") + PlayerU.surname;
        await Comment();
        St = pas.nls.Loc('The referee punishes the "hero" - a red card!!!',"Суддя карає «героя» — червона картка!!!");
        Match.Ft[Pt - 1].footballers[n1 - 1].fall = $mod.FallType.RedCard;
        Match.Ft[Pt - 1].footballers[n1 - 1].play = false;
        NewThing(Pt,TTT.r,Player2.surname,"");
        await Comment();
        N = 23;
      };
    };
    async function EPr25() {
      var n00 = 0;
      MinNow += 1;
      do {
        n00 = pas.System.Random(10) + 2;
        PlayerU.$assign(Match.Ft[Pt - 1].footballers[n00 - 1]);
      } while (!PlayerU.play);
      St = pas.nls.Loc("The ball hits ","Мʼяч влучає в ") + PlayerU.surname + pas.nls.Loc(" and flies towards the goal!!!"," і летить у бік воріт!!!");
      await Comment();
      n0 = pas.System.Random(100);
      if (n0 < 90) {
        St = pas.nls.Loc("The keeper can do nothing about it","Воротар уже нічого не може вдіяти");
        await Comment();
        St = pas.nls.Loc("An own goal!","Свій забив своїм!");
        await Comment();
        St = pas.nls.Loc("That is the last place the keeper expected a shot from!!!","Ось звідки воротар удару не чекав!!!");
        await Comment();
        St = pas.nls.Loc("What a disgrace!!!","Яка ганьба!!!");
        await Comment();
        n0 = pas.System.Random(100);
        if ((n0 < 75) && (InOut[Pt - 1] !== 0)) await HelpPr7(Pt,n00,0);
        SP = pas.nls.Loc("og","аг");
        N = 21;
      } else {
        St = pas.nls.Loc("The keeper reaches his teammate's ball and saves the day!!!","Воротар дістає свій же мʼяч і рятує команду від ганьби!!!");
        await Comment();
        N = 16;
      };
    };
    async function HelpPr5() {
      n0 = pas.System.Random(5) + 1;
      MinEnd = MinEnd + n0;
      St = "" + n0;
      St = pas.nls.Loc("The referee has added to normal time ","Суддя додав до основного часу ") + St + pas.nls.Loc(" minutes"," хвилин");
      await Comment();
    };
    async function HelpPr6() {
      var j = 0;
      async function Penalti(i, t) {
        var p = 0;
        Half = 5;
        SP = pas.nls.Loc("so","сп");
        St = "" + i;
        St = pas.nls.Loc("Team ","Команда ") + Match.Ft[t - 1].name + pas.nls.Loc(" takes his "," бʼє свій ") + St + pas.nls.Loc(" penalty"," пенальті");
        await Comment();
        do {
          p = 12 - i;
          i = i - 11;
        } while (!((p >= 1) && (p <= 11)));
        do {
          PlayerU.$assign(Match.Ft[t - 1].footballers[p - 1]);
          p -= 1;
        } while (!PlayerU.play);
        St = pas.nls.Loc("Stepping up to the ball is ","До мʼяча підходить ") + PlayerU.name + " " + PlayerU.surname;
        await Comment();
        St = pas.nls.Loc("He shoots!!!","Він бʼє!!!");
        await Comment();
        n0 = pas.System.Random(100) + 1;
        var $tmp = n0;
        if (($tmp >= 0) && ($tmp <= 75)) {
          St = pas.nls.Loc("Keeper and ball fly into opposite corners!","Воротар і мʼяч розлітаються в різні кути!");
          await Comment();
          St = pas.nls.Loc("GOAL!!!","ГОЛ!!!");
          await Comment();
          St = pas.nls.Loc("GOAL!!!","ГОЛ!!!");
          await Comment();
          St = pas.nls.Loc("GOAL!!!","ГОЛ!!!");
          await Comment();
          St = PlayerU.name + " " + PlayerU.surname + pas.nls.Loc(" scores it!!!"," забиває цей гол!!!");
          NewThing(t,TTT.g,PlayerU.surname,SP);
          Match.Score[t - 1] += 1;
        } else if (($tmp >= 76) && ($tmp <= 90)) {
          St = pas.nls.Loc("The keeper saves it!!!","Воротар ловить цей мʼяч!!!");
          await Comment();
        } else {
          St = pas.nls.Loc("WIDE!!!","ПОВЗ ВОРОТА!!!");
          await Comment();
        };
      };
      Half = 5;
      St = pas.nls.Loc("After 120 minutes it is a draw! It goes to a penalty shootout!","Після 120 хвилин — нічия! Результат — серія пенальті!");
      await Comment();
      St = pas.nls.Loc("First to shoot is ","Першою бʼє команда ") + Match.Ft[At - 1].name;
      await Comment();
      j = 1;
      do {
        await Penalti(j,1);
        await Penalti(j,2);
        j += 1;
      } while (!(j === 6));
      while (Match.Score[0] === Match.Score[1]) {
        await Penalti(j,1);
        await Penalti(j,2);
        j += 1;
      };
    };
    pas.crt.TextColor(15);
    pas.crt.Randomize();
    Match.Score[0] = 0;
    Match.Score[1] = 0;
    Half = 0;
    MinNow = 0;
    SP = "";
    for (i = 1; i <= 2; i++) for (j = 1; j <= 13; j++) {
      Things[i - 1][j - 1].flag = false;
      Things[i - 1][j - 1].StPlus = "";
      Things[i - 1][j - 1].Min = 0;
      Things[i - 1][j - 1].HT = 0;
      Things[i - 1][j - 1].Surname = "";
    };
    await HelpPr1();
    InOut[0] = 3;
    InOut[1] = 3;
    do {
      DoTeamP();
      Half += 1;
      var $tmp = Half;
      if ($tmp === 1) {
        At = 1;
        Pt = 2;
        MinNow = 1;
        MinEnd = 45;
      } else if ($tmp === 2) {
        At = 2;
        Pt = 1;
        MinNow = 45;
        MinEnd = 90;
      } else if ($tmp === 3) {
        At = 1;
        Pt = 2;
        MinNow = 90;
        MinEnd = 105;
      } else if ($tmp === 4) {
        At = 2;
        Pt = 1;
        MinNow = 105;
        MinEnd = 120;
      } else if ($tmp === 5) {
        At = 1;
        Pt = 2;
        await HelpPr6();
      };
      if ((Half !== 1) && (Half !== 5)) {
        n0 = pas.System.Random(100);
        var $tmp1 = n0;
        if (($tmp1 >= 25) && ($tmp1 <= 50)) {
          if (InOut[0] !== 0) await HelpPr7(1,0,0)}
         else if (($tmp1 >= 51) && ($tmp1 <= 75)) if (InOut[1] !== 0) await HelpPr7(2,0,0);
        await HelpPr2();
      };
      if (N !== 5) {
        N = 1}
       else N = 0;
      do {
        if ((MinNow % 15) === 0) DoTeamP();
        var $tmp2 = N;
        if ($tmp2 === 1) {
          await EPr1()}
         else if ($tmp2 === 2) {
          await EPr2()}
         else if ($tmp2 === 3) {
          await EPr3()}
         else if ($tmp2 === 4) {
          await EPr4()}
         else if ($tmp2 === 5) {
          await EPr5()}
         else if ($tmp2 === 6) {
          await EPr6()}
         else if ($tmp2 === 7) {
          EPr7()}
         else if ($tmp2 === 8) {
          await EPr8()}
         else if ($tmp2 === 9) {
          await Epr9()}
         else if ($tmp2 === 10) {
          await EPr10()}
         else if ($tmp2 === 11) {
          await EPr11()}
         else if ($tmp2 === 12) {
          await Epr12()}
         else if ($tmp2 === 13) {
          await EPr13()}
         else if ($tmp2 === 14) {
          await EPr14()}
         else if ($tmp2 === 141) {
          await EPr141()}
         else if ($tmp2 === 142) {
          await EPr142()}
         else if ($tmp2 === 15) {
          await EPr15()}
         else if ($tmp2 === 16) {
          await EPr16()}
         else if ($tmp2 === 17) {
          await EPr17()}
         else if ($tmp2 === 18) {
          await EPr18()}
         else if ($tmp2 === 19) {
          await EPr19()}
         else if ($tmp2 === 20) {
          await EPr20()}
         else if ($tmp2 === 21) {
          await EPr21()}
         else if ($tmp2 === 22) {
          await Epr22()}
         else if ($tmp2 === 23) {
          await EPr23()}
         else if ($tmp2 === 24) {
          await EPr24()}
         else if ($tmp2 === 25) await EPr25();
        if ((MinNow === 45) && (Half === 1)) await HelpPr5();
        if ((MinNow === 90) && (Half === 2)) await HelpPr5();
        if ((MinNow === 115) && (Half === 3)) await HelpPr5();
        if ((MinNow === 120) && (Half === 4)) await HelpPr5();
      } while (!(MinNow === MinEnd));
      await HelpPr3();
      flag = Half === Match.HalfEnd;
      if ((Match.HalfEnd === 5) && (Match.Score[0] !== Match.Score[1]) && (Half !== 1) && (Half !== 3)) flag = true;
      if ((Match.HalfEnd === 5) && (Match.Score[0] === Match.Score[1]) && (Half === 2)) {
        St = pas.nls.Loc("The match ended in a draw!","Матч завершився внічию!");
        await Comment();
        St = pas.nls.Loc("Extra time will now be played","Зараз будуть зіграні додаткові тайми");
        await Comment();
      };
      if (Half === 5) flag = true;
    } while (!(flag || (Half === 5)));
    await HelpPr4();
    await pas.crt.Delay(Math.round(2 * 1000));
  };
},["JS","crt","nls"]);
rtl.module("dos",["System"],function () {
  "use strict";
  var $mod = this;
  this.GetDate = function (year, month, day, dow) {
    var now = 0.0;
    var y = 0;
    var m = 0;
    var d = 0;
    now = pas.SysUtils.Date();
    pas.SysUtils.DecodeDate(now,{get: function () {
        return y;
      }, set: function (v) {
        y = v;
      }},{get: function () {
        return m;
      }, set: function (v) {
        m = v;
      }},{get: function () {
        return d;
      }, set: function (v) {
        d = v;
      }});
    year.set(y);
    month.set(m);
    day.set(d);
    dow.set(pas.SysUtils.DayOfWeek(now) - 1);
  };
},["SysUtils"]);
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
  this.ReadNum = function (f) {
    var Result = 0;
    var lines = undefined;
    var v = 0.0;
    if (f.mode !== 1) $impl.RTE(104);
    lines = $impl.GetLines(f.name);
    if (lines == null) $impl.RTE(2);
    v = 0;
    // Skip whitespace and line breaks to the next token — TP numeric read.
    for (;;) {
      if (f.cursor >= lines.length) { $impl.RTE(100); }
      var line = lines[f.cursor];
      while (f.col < line.length && (line[f.col] === ' ' || line[f.col] === '\t')) f.col++;
      if (f.col >= line.length) { f.cursor++; f.col = 0; continue; }
      var m = /^[+-]?\d+/.exec(line.substring(f.col));
      if (!m) { $impl.RTE(106); }
      v = Number(m[0]);
      f.col += m[0].length;
      break;
    };
    Result = pas.System.Trunc(v);
    return Result;
  };
  this.ReadLnNum = function (f) {
    var Result = 0;
    Result = $mod.ReadNum(f);
    f.cursor = f.cursor + 1;
    f.col = 0;
    return Result;
  };
  this.Close = function (f) {
    f.mode = 0;
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
    // In-memory overlay FIRST. The lab page runs every game inside a sandboxed
    // iframe (Tier 3), which is an opaque origin — localStorage there THROWS on
    // both get and set. Without this overlay a game that writes a file and reads
    // it back in the same session loses the write silently: PINGPONG's shifr copy
    // (DeShifrovka .cod -> .opt) vanished, Reset hit RTE(2) inside an async
    // procedure, and the screen just stayed black. It worked standalone, where
    // localStorage is writable, which is exactly why testing only the standalone
    // page missed it.
    window.__retroMem = window.__retroMem || {};
    var memKey = (window.__retroSlug || 'game') + ':' + name;
    if (Object.prototype.hasOwnProperty.call(window.__retroMem, memKey)) {
      Result = window.__retroMem[memKey]; return Result;
    }
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
});
rtl.module("program",["System","JS","EMatch","dos","crt","tpfiles","nls"],function () {
  "use strict";
  var $mod = this;
  this.t = 7;
  this.p = 105;
  this.s = 7;
  this.c = 3;
  this.TeamsName = ["Dynamo","Milan","Arsenal","Niva","MU","Shahtar","Shpors"];
  this.BoxL = 11;
  this.BoxW = 60;
  this.RowOf = 8;
  this.Teams = rtl.arraySetLength(null,pas.EMatch.FootBallTeam,7);
  this.Players = rtl.arraySetLength(null,pas.EMatch.FootBaller,106);
  this.Stadiums = rtl.arraySetLength(null,pas.EMatch.StadiumType,7);
  this.Countries = rtl.arraySetLength(null,pas.EMatch.StateType,3);
  this.i = 0;
  this.j = 0;
  this.st = "";
  this.Team1 = pas.EMatch.FootBallTeam.$new();
  this.Team2 = pas.EMatch.FootBallTeam.$new();
  this.f = pas.tpfiles.Text.$new();
  this.m = 0;
  this.NowMatch = pas.EMatch.MatchType.$new();
  this.dy = 0;
  this.dm = 0;
  this.dd = 0;
  this.dw = 0;
  this.Pick = 0;
  this.home = 0;
  this.Fit = function (src, n) {
    var Result = "";
    var r = "";
    r = src;
    while (r.length < n) r = r + " ";
    if (r.length > n) r = pas.System.Copy(r,1,n);
    Result = r;
    return Result;
  };
  this.Rule = function (row, l, mid, r) {
    var k = 0;
    pas.crt.GotoXY(11,row);
    pas.System.Write(l);
    for (k = 1; k <= 58; k++) pas.System.Write(mid);
    pas.System.Write(r);
  };
  this.Centre = function (row, s1) {
    pas.crt.GotoXY(11 + 1 + Math.floor((60 - 2 - s1.length) / 2),row);
    pas.System.Write(s1);
  };
  this.Header = function () {
    pas.crt.TextBackground(0);
    pas.crt.TextColor(7);
    pas.crt.ClrScr();
    pas.crt.TextColor(3);
    $mod.Rule(2,"┌","─","┐");
    pas.crt.GotoXY(11,3);
    pas.System.Write("│");
    pas.crt.GotoXY((11 + 60) - 1,3);
    pas.System.Write("│");
    pas.crt.GotoXY(11,4);
    pas.System.Write("│");
    pas.crt.GotoXY((11 + 60) - 1,4);
    pas.System.Write("│");
    $mod.Rule(5,"└","─","┘");
    pas.crt.TextColor(14);
    $mod.Centre(3,"F O O T B A L L");
    pas.crt.TextColor(8);
    $mod.Centre(4,pas.nls.Loc("match simulator  ·  7 teams  ·  105 players","симулятор матчу  ·  7 команд  ·  105 гравців"));
    pas.crt.TextColor(7);
  };
  this.Progress = function (row, caption, done, total) {
    var k = 0;
    var fill = 0;
    var a = "";
    var b = "";
    pas.crt.TextBackground(0);
    pas.crt.TextColor(7);
    pas.crt.GotoXY(11 + 1,row);
    pas.System.Write($mod.Fit(caption,16));
    fill = 0;
    if (total > 0) fill = Math.floor((done * 24) / total);
    for (k = 1; k <= 24; k++) {
      if (k <= fill) {
        pas.crt.TextBackground(2)}
       else pas.crt.TextBackground(8);
      pas.System.Write(" ");
    };
    pas.crt.TextBackground(0);
    pas.crt.TextColor(15);
    a = "" + done;
    b = "" + total;
    pas.System.Write(" " + $mod.Fit(a + "\/" + b,9));
    pas.crt.TextColor(7);
  };
  this.TeamRow = function (k, current, taken) {
    var a = "";
    a = "" + k;
    if (current) {
      pas.crt.TextBackground(1);
      pas.crt.TextColor(14);
    } else {
      pas.crt.TextBackground(0);
      if (taken) {
        pas.crt.TextColor(8)}
       else pas.crt.TextColor(7);
    };
    pas.crt.GotoXY(11 + 1,8 + k);
    pas.System.Write($mod.Fit(" " + a + "  " + $mod.Fit($mod.TeamsName[k - 1],10) + $mod.Fit($mod.Teams[k - 1].name,20) + $mod.Teams[k - 1].state.name,60 - 2));
    pas.crt.TextBackground(0);
    pas.crt.TextColor(7);
  };
  this.ChooseTeam = async function (heading, exclude) {
    var cur = 0;
    var k = 0;
    var code = 0;
    cur = 1;
    if (cur === exclude) cur = 2;
    pas.crt.TextBackground(0);
    pas.crt.TextColor(15);
    pas.crt.GotoXY(11 + 1,7);
    pas.System.Write($mod.Fit(heading,60 - 2));
    pas.crt.TextColor(8);
    pas.crt.GotoXY(11 + 1,8 + 7 + 2);
    pas.System.Write($mod.Fit(pas.nls.Loc("up\/down + Enter, or press 1-7","вгору\/вниз + Enter, або цифра 1-7"),60 - 2));
    pas.crt.TextColor(7);
    code = 0;
    do {
      for (k = 1; k <= 7; k++) $mod.TeamRow(k,k === cur,k === exclude);
      code = pas.System.Trunc(await pas.crt.ReadKeyA());
      if (code === 0) {
        code = pas.System.Trunc(await pas.crt.ReadKeyA());
        if (code === 72) do {
          if (cur === 1) {
            cur = 7}
           else cur -= 1;
        } while (!(cur !== exclude));
        if (code === 80) do {
          if (cur === 7) {
            cur = 1}
           else cur += 1;
        } while (!(cur !== exclude));
        code = 0;
      } else if ((code >= 49) && (code <= (48 + 7))) {
        if ((code - 48) !== exclude) {
          cur = code - 48;
          code = 13;
        } else code = 0;
      };
    } while (!(code === 13));
    for (k = 1; k <= 7; k++) $mod.TeamRow(k,false,(k === exclude) || (k === cur));
    $mod.Pick = cur;
  };
  this.Main = async function () {
    pas.crt.Randomize();
    $mod.Header();
    $mod.Progress(7,pas.nls.Loc("Countries","Країни"),0,3);
    $mod.Progress(9,pas.nls.Loc("Stadiums","Стадіони"),0,7);
    $mod.Progress(11,pas.nls.Loc("Players","Гравці"),0,105 + 1);
    $mod.Progress(13,pas.nls.Loc("Teams","Команди"),0,7);
    for ($mod.i = 1; $mod.i <= 3; $mod.i++) {
      $mod.st = "" + $mod.i;
      pas.tpfiles.Assign($mod.f,"STT\\" + $mod.st + ".stt");
      pas.tpfiles.Reset($mod.f);
      pas.tpfiles.ReadlnT($mod.f,{p: $mod.Countries[$mod.i - 1], get: function () {
          return this.p.name;
        }, set: function (v) {
          this.p.name = v;
        }});
      pas.tpfiles.Close($mod.f);
      $mod.Progress(7,pas.nls.Loc("Countries","Країни"),$mod.i,3);
    };
    await pas.crt.FrameDelay(120);
    for ($mod.i = 1; $mod.i <= 7; $mod.i++) {
      $mod.st = "" + $mod.i;
      pas.tpfiles.Assign($mod.f,"STD\\" + $mod.st + ".std");
      pas.tpfiles.Reset($mod.f);
      $mod.Stadiums[$mod.i - 1].Seats = pas.tpfiles.ReadLnNum($mod.f);
      pas.tpfiles.ReadlnT($mod.f,{p: $mod.Stadiums[$mod.i - 1], get: function () {
          return this.p.name;
        }, set: function (v) {
          this.p.name = v;
        }});
      $mod.m = pas.tpfiles.ReadLnNum($mod.f);
      $mod.Stadiums[$mod.i - 1].state.$assign($mod.Countries[$mod.m - 1]);
      pas.tpfiles.Close($mod.f);
      $mod.Progress(9,pas.nls.Loc("Stadiums","Стадіони"),$mod.i,7);
    };
    await pas.crt.FrameDelay(120);
    for ($mod.i = 0; $mod.i <= 105; $mod.i++) {
      $mod.st = "" + $mod.i;
      pas.tpfiles.Assign($mod.f,"FBP\\" + $mod.st + ".fbp");
      pas.tpfiles.Reset($mod.f);
      pas.tpfiles.ReadlnT($mod.f,{p: $mod.Players[$mod.i], get: function () {
          return this.p.name;
        }, set: function (v) {
          this.p.name = v;
        }});
      pas.tpfiles.ReadlnT($mod.f,{p: $mod.Players[$mod.i], get: function () {
          return this.p.surname;
        }, set: function (v) {
          this.p.surname = v;
        }});
      $mod.Players[$mod.i].mark = pas.tpfiles.ReadLnNum($mod.f);
      $mod.Players[$mod.i].tiredness = pas.tpfiles.ReadLnNum($mod.f);
      $mod.Players[$mod.i].mood = pas.tpfiles.ReadLnNum($mod.f);
      $mod.Players[$mod.i].number = pas.tpfiles.ReadLnNum($mod.f);
      $mod.m = pas.tpfiles.ReadLnNum($mod.f);
      var $tmp = $mod.m;
      if ($tmp === 0) {
        $mod.Players[$mod.i].here = false}
       else {
        $mod.Players[$mod.i].here = true;
      };
      $mod.m = pas.tpfiles.ReadLnNum($mod.f);
      var $tmp1 = $mod.m;
      if ($tmp1 === 0) {
        $mod.Players[$mod.i].play = false}
       else {
        $mod.Players[$mod.i].play = true;
      };
      $mod.m = pas.tpfiles.ReadLnNum($mod.f);
      var $tmp2 = $mod.m;
      if ($tmp2 === 0) {
        $mod.Players[$mod.i].fall = pas.EMatch.FallType.NoFall}
       else if ($tmp2 === 1) {
        $mod.Players[$mod.i].fall = pas.EMatch.FallType.YellowCard}
       else {
        $mod.Players[$mod.i].fall = pas.EMatch.FallType.RedCard;
      };
      pas.tpfiles.Close($mod.f);
      $mod.Progress(11,pas.nls.Loc("Players","Гравці"),$mod.i + 1,105 + 1);
    };
    await pas.crt.FrameDelay(120);
    for ($mod.i = 1; $mod.i <= 7; $mod.i++) {
      $mod.st = "" + $mod.i;
      pas.tpfiles.Assign($mod.f,"FBT\\" + $mod.st + ".fbt");
      pas.tpfiles.Reset($mod.f);
      pas.tpfiles.ReadlnT($mod.f,{p: $mod.Teams[$mod.i - 1], get: function () {
          return this.p.name;
        }, set: function (v) {
          this.p.name = v;
        }});
      for ($mod.j = 1; $mod.j <= 30; $mod.j++) {
        $mod.m = pas.tpfiles.ReadNum($mod.f);
        $mod.Teams[$mod.i - 1].footballers[$mod.j - 1].$assign($mod.Players[$mod.m]);
      };
      $mod.m = pas.tpfiles.ReadLnNum($mod.f);
      $mod.Teams[$mod.i - 1].state.$assign($mod.Countries[$mod.m - 1]);
      $mod.m = pas.tpfiles.ReadLnNum($mod.f);
      pas.tpfiles.Close($mod.f);
      $mod.Teams[$mod.i - 1].stadiumteam.$assign($mod.Stadiums[$mod.m - 1]);
      $mod.Teams[$mod.i - 1].Mark = 0;
      $mod.Teams[$mod.i - 1].tiredness = 0;
      $mod.Teams[$mod.i - 1].mood = 0;
      for ($mod.j = 1; $mod.j <= 11; $mod.j++) {
        $mod.Teams[$mod.i - 1].Mark = $mod.Teams[$mod.i - 1].footballers[$mod.j - 1].mark + $mod.Teams[$mod.i - 1].Mark;
        $mod.Teams[$mod.i - 1].tiredness = $mod.Teams[$mod.i - 1].footballers[$mod.j - 1].tiredness + $mod.Teams[$mod.i - 1].tiredness;
        $mod.Teams[$mod.i - 1].mood = $mod.Teams[$mod.i - 1].footballers[$mod.j - 1].mood + $mod.Teams[$mod.i - 1].mood;
      };
      $mod.Teams[$mod.i - 1].Mark = Math.floor($mod.Teams[$mod.i - 1].Mark / 11);
      $mod.Teams[$mod.i - 1].tiredness = Math.floor($mod.Teams[$mod.i - 1].tiredness / 11);
      $mod.Teams[$mod.i - 1].mood = Math.floor($mod.Teams[$mod.i - 1].mood / 11);
      $mod.Progress(13,pas.nls.Loc("Teams","Команди"),$mod.i,7);
    };
    await pas.crt.FrameDelay(260);
    $mod.Header();
    await $mod.ChooseTeam(pas.nls.Loc("Home team","Господарі поля"),0);
    $mod.home = $mod.Pick;
    $mod.Team1.$assign($mod.Teams[$mod.home - 1]);
    await $mod.ChooseTeam(pas.nls.Loc("Away team","Гості"),$mod.home);
    $mod.Team2.$assign($mod.Teams[$mod.Pick - 1]);
    var $with = $mod.NowMatch;
    $with.Stadium.$assign($mod.Team1.stadiumteam);
    $with.Ft[0].$assign($mod.Team1);
    $with.Ft[1].$assign($mod.Team2);
    $with.OnLooker = pas.System.Random($with.Stadium.Seats) + 1;
    $with.Score[0] = 0;
    $with.Score[1] = 0;
    $with.HalfEnd = 2;
    pas.dos.GetDate({p: $mod, get: function () {
        return this.p.dy;
      }, set: function (v) {
        this.p.dy = v;
      }},{p: $mod, get: function () {
        return this.p.dm;
      }, set: function (v) {
        this.p.dm = v;
      }},{p: $mod, get: function () {
        return this.p.dd;
      }, set: function (v) {
        this.p.dd = v;
      }},{p: $mod, get: function () {
        return this.p.dw;
      }, set: function (v) {
        this.p.dw = v;
      }});
    $with.Date.year = $mod.dy;
    $with.Date.month = $mod.dm;
    $with.Date.date = $mod.dd;
    $with.FileCom = "Match.txt";
    $mod.Header();
    pas.crt.TextColor(15);
    $mod.Centre(8,$mod.Team1.name + "   —   " + $mod.Team2.name);
    pas.crt.TextColor(7);
    $mod.Centre(10,$mod.NowMatch.Stadium.name + "  ·  " + $mod.NowMatch.Stadium.state.name);
    $mod.st = "" + $mod.NowMatch.OnLooker;
    $mod.Centre(11,$mod.st + pas.nls.Loc(" spectators"," глядачів"));
    pas.crt.TextColor(2);
    $mod.Centre(13,pas.nls.Loc("Kick-off","Початок матчу"));
    pas.crt.TextColor(7);
    await pas.crt.FrameDelay(1400);
    await pas.EMatch.EmulMatch($mod.NowMatch);
  };
  $mod.$main = function () {
    $mod.Main();
  };
});
