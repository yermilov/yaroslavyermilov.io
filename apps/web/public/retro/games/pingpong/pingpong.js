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
  rtl.recNewT($mod,"TTimeStamp",function () {
    this.Time = 0;
    this.Date = 0;
    this.$eq = function (b) {
      return (this.Time === b.Time) && (this.Date === b.Date);
    };
    this.$assign = function (s) {
      this.Time = s.Time;
      this.Date = s.Date;
      return this;
    };
  });
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
  this.DateTimeToTimeStamp = function (DateTime) {
    var Result = $mod.TTimeStamp.$new();
    var D = 0.0;
    D = DateTime * 86400000;
    if (D < 0) {
      D = D - 0.5}
     else D = D + 0.5;
    Result.Time = pas.System.Trunc(Math.abs(pas.System.Trunc(D)) % 86400000);
    Result.Date = 693594 + Math.floor(pas.System.Trunc(D) / 86400000);
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
  this.DecodeTime = function (Time, Hour, Minute, Second, MilliSecond) {
    var l = 0;
    l = $mod.DateTimeToTimeStamp(Time).Time;
    Hour.set(Math.floor(l / 3600000));
    l = l % 3600000;
    Minute.set(Math.floor(l / 60000));
    l = l % 60000;
    Second.set(Math.floor(l / 1000));
    l = l % 1000;
    MilliSecond.set(l);
  };
  this.Date = function () {
    var Result = 0.0;
    Result = pas.System.Trunc($mod.Now());
    return Result;
  };
  this.Time = function () {
    var Result = 0.0;
    Result = $mod.Now() - $mod.Date();
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
  this.Detect = 0;
  this.GrOk = 0;
  this.grNotDetected = -2;
  this.HorizDir = 0;
  this.VertDir = 1;
  this.ScreenW = 640;
  this.ScreenH = 480;
  this.InitGraph = function (gd, gm, path) {
    pas.crt.TextShutdown();
    $impl.Canvas = document.getElementById("screen");
    if ($impl.Canvas === null) {
      $impl.LastResult = -2;
      return;
    };
    $impl.Canvas.width = 640;
    $impl.Canvas.height = 480;
    $impl.Ctx = $impl.Canvas.getContext("2d");
    $impl.Img = $impl.Ctx.createImageData(640,480);
    $impl.FB = rtl.arraySetLength($impl.FB,0,640 * 480);
    $mod.ClearDevice();
    $impl.LastResult = 0;
    gm.set(0);
    window.requestAnimationFrame($impl.Frame);
  };
  this.CloseGraph = function () {
    $impl.Ctx = null;
    $impl.Canvas = null;
    $impl.Img = null;
    $impl.FB = rtl.arraySetLength($impl.FB,0,0);
  };
  this.GraphActive = function () {
    var Result = false;
    Result = $impl.Ctx !== null;
    return Result;
  };
  this.GraphResult = function () {
    var Result = 0;
    Result = $impl.LastResult;
    return Result;
  };
  this.GraphErrorMsg = function (code) {
    var Result = "";
    if (code === 0) {
      Result = ""}
     else Result = "Graphics error " + pas.SysUtils.IntToStr(code);
    return Result;
  };
  this.SetColor = function (c) {
    $impl.CurColor = c & 15;
  };
  this.SetFillStyle = function (pattern, c) {
    $impl.FillColor = c & 15;
  };
  this.PutPixel = function (x, y, c) {
    if ((x < 0) || (y < 0) || (x >= 640) || (y >= 480)) return;
    $impl.FB[(y * 640) + x] = c & 15;
  };
  this.Line = function (x1, y1, x2, y2) {
    var dx = 0;
    var dy = 0;
    var sx = 0;
    var sy = 0;
    var err = 0;
    var e2 = 0;
    dx = Math.abs(x2 - x1);
    dy = -Math.abs(y2 - y1);
    if (x1 < x2) {
      sx = 1}
     else sx = -1;
    if (y1 < y2) {
      sy = 1}
     else sy = -1;
    err = dx + dy;
    while (true) {
      $mod.PutPixel(x1,y1,$impl.CurColor);
      if ((x1 === x2) && (y1 === y2)) break;
      e2 = 2 * err;
      if (e2 >= dy) {
        err = err + dy;
        x1 = x1 + sx;
      };
      if (e2 <= dx) {
        err = err + dx;
        y1 = y1 + sy;
      };
    };
  };
  this.Rectangle = function (x1, y1, x2, y2) {
    $mod.Line(x1,y1,x2,y1);
    $mod.Line(x2,y1,x2,y2);
    $mod.Line(x2,y2,x1,y2);
    $mod.Line(x1,y2,x1,y1);
  };
  this.Bar = function (x1, y1, x2, y2) {
    var x = 0;
    var y = 0;
    var t = 0;
    if (x1 > x2) {
      t = x1;
      x1 = x2;
      x2 = t;
    };
    if (y1 > y2) {
      t = y1;
      y1 = y2;
      y2 = t;
    };
    for (var $l = y1, $end = y2; $l <= $end; $l++) {
      y = $l;
      for (var $l1 = x1, $end1 = x2; $l1 <= $end1; $l1++) {
        x = $l1;
        $mod.PutPixel(x,y,$impl.FillColor);
      };
    };
  };
  this.Circle = function (x, y, r) {
    var cx = 0;
    var cy = 0;
    var err = 0;
    cx = r;
    cy = 0;
    err = 1 - cx;
    while (cx >= cy) {
      $mod.PutPixel(x + cx,y + cy,$impl.CurColor);
      $mod.PutPixel(x + cy,y + cx,$impl.CurColor);
      $mod.PutPixel(x - cy,y + cx,$impl.CurColor);
      $mod.PutPixel(x - cx,y + cy,$impl.CurColor);
      $mod.PutPixel(x - cx,y - cy,$impl.CurColor);
      $mod.PutPixel(x - cy,y - cx,$impl.CurColor);
      $mod.PutPixel(x + cy,y - cx,$impl.CurColor);
      $mod.PutPixel(x + cx,y - cy,$impl.CurColor);
      cy += 1;
      if (err < 0) {
        err = err + (2 * cy) + 1}
       else {
        cx -= 1;
        err = err + (2 * (cy - cx)) + 1;
      };
    };
  };
  this.FloodFill = function (x, y, border) {
    var stack = [];
    var sp = 0;
    var p = 0;
    var px = 0;
    var py = 0;
    var b = 0;
    var f = 0;
    function Push(idx) {
      if (sp >= rtl.length(stack)) stack = rtl.arraySetLength(stack,0,rtl.length(stack) * 2);
      stack[sp] = idx;
      sp += 1;
    };
    b = border & 15;
    f = $impl.FillColor;
    if ((x < 0) || (y < 0) || (x >= 640) || (y >= 480)) return;
    if ($impl.FB[(y * 640) + x] === b) return;
    stack = rtl.arraySetLength(stack,0,4096);
    sp = 0;
    Push((y * 640) + x);
    while (sp > 0) {
      sp -= 1;
      p = stack[sp];
      if ($impl.FB[p] === b) continue;
      if ($impl.FB[p] === f) continue;
      $impl.FB[p] = f;
      px = p % 640;
      py = Math.floor(p / 640);
      if (px > 0) Push(p - 1);
      if (px < (640 - 1)) Push(p + 1);
      if (py > 0) Push(p - 640);
      if (py < (480 - 1)) Push(p + 640);
    };
  };
  this.ClearDevice = function () {
    var i = 0;
    if (rtl.length($impl.FB) === 0) return;
    for (i = 0; i <= 307199; i++) $impl.FB[i] = 0;
  };
  this.SetTextStyle = function (font, direction, charsize) {
    if (charsize < 1) charsize = 1;
    $impl.TextPxH = (6 * charsize) + 8;
  };
  this.OutTextXY = function (x, y, s) {
    var px = 0;
    px = $impl.TextPxH;
    var scr = document.createElement('canvas');
    var w = Math.min(1024, Math.max(8, Math.ceil(s.length * px)));
    scr.width = w; scr.height = px + 8;
    var c2 = scr.getContext('2d', { willReadFrequently: true });
    c2.font = px + "px 'IBM VGA', monospace";
    c2.textBaseline = 'top';
    c2.fillStyle = '#fff';
    c2.fillText(s, 0, 0);
    var d = c2.getImageData(0, 0, scr.width, scr.height).data;
    for (var j = 0; j < scr.height; j++) {
      for (var i = 0; i < scr.width; i++) {
        if (d[(j * scr.width + i) * 4 + 3] > 128) {
          pas.graph.PutPixel(x + i, y + j, $impl.CurColor);
        }
      }
    };
  };
},["JS","Web","weborworker","SysUtils","crt"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  $impl.FB = [];
  $impl.CurColor = 15;
  $impl.FillColor = 15;
  $impl.LastResult = 0;
  $impl.Canvas = null;
  $impl.Ctx = null;
  $impl.Img = null;
  $impl.PalR = [0,0,0,0,168,168,168,168,84,84,84,84,255,255,255,255];
  $impl.PalG = [0,0,168,168,0,0,84,168,84,84,255,255,84,84,255,255];
  $impl.PalB = [0,168,0,168,0,168,0,168,84,255,84,255,84,255,84,255];
  $impl.Present = function () {
    var i = 0;
    var n = 0;
    var d = null;
    var c = 0;
    if ($impl.Ctx === null) return;
    d = $impl.Img.data;
    n = 640 * 480;
    for (var $l = 0, $end = n - 1; $l <= $end; $l++) {
      i = $l;
      c = $impl.FB[i];
      d[i * 4] = $impl.PalR[c];
      d[(i * 4) + 1] = $impl.PalG[c];
      d[(i * 4) + 2] = $impl.PalB[c];
      d[(i * 4) + 3] = 255;
    };
    $impl.Ctx.putImageData($impl.Img,0,0);
  };
  $impl.Frame = function (aTime) {
    $impl.Present();
    window.requestAnimationFrame($impl.Frame);
  };
  $impl.TextPxH = 16;
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
  this.Delay = function (ms) {
    var Result = null;
    var wait = 0;
    $impl.Install();
    wait = Math.round(ms * $mod.DelayScale);
    Result = new Promise(function (resolve, reject) {
      window.setTimeout(function () {
        resolve(0);
      },wait);
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
  this.TextShutdown = function () {
    if (!$impl.TextActive) return;
    $impl.TextActive = false;
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
  this.Readln = function () {
  };
  this.DelayScale = 0.004;
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
rtl.module("mouse",["System"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  this.InitMouse = function () {
    var Result = false;
    $impl.Install();
    Result = true;
    return Result;
  };
  this.ShowMouse = function () {
    $impl.Install();
    var c = document.getElementById('screen');
    if (c) c.style.cursor = 'default';
  };
  this.HideMouse = function () {
    $impl.Install();
    var c = document.getElementById('screen');
    if (c) c.style.cursor = 'none';
  };
  this.MouseX = function () {
    var Result = 0;
    $impl.Install();
    Result = $impl.MX;
    return Result;
  };
  this.MouseY = function () {
    var Result = 0;
    $impl.Install();
    Result = $impl.MY;
    return Result;
  };
  this.LeftButton = function () {
    var Result = false;
    Result = $impl.BL;
    return Result;
  };
},["Web"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  $impl.Installed = false;
  $impl.MX = 320;
  $impl.MY = 240;
  $impl.BL = false;
  $impl.Install = function () {
    if ($impl.Installed) return;
    $impl.Installed = true;
    var canvas = document.getElementById('screen');
    if (!canvas) return;
    var track = function (e) {
      var r = canvas.getBoundingClientRect();
      // object-fit:contain: the 640×480 drawing is centered at uniform scale.
      var scale = Math.min(r.width / 640, r.height / 480);
      if (scale <= 0) return;
      var ox = (r.width - 640 * scale) / 2;
      var oy = (r.height - 480 * scale) / 2;
      var x = Math.round((e.clientX - r.left - ox) / scale);
      var y = Math.round((e.clientY - r.top - oy) / scale);
      $impl.MX = Math.max(0, Math.min(639, x));
      $impl.MY = Math.max(0, Math.min(479, y));
    };
    // The DOS games sample LeftButton at discrete poll points in their menu
    // loops (await(Yield) between checks). Two failure modes had to be closed:
    //   (1) many synthetic click injectors leave e.buttons === 0 on mousedown,
    //       so the old bitmask-only read NEVER saw the press — the WARWORK menu
    //       could not be left with a programmatic click;
    //   (2) a fast/synthetic click's pressed window can fall entirely BETWEEN
    //       two polls and be missed.
    // Fix: latch by button INDEX on down/up (the index is set even when the
    // bitmask is not), and hold the button "down" for a short grace after
    // release so at least one poll observes every click.
    var GRACE = 140;
    var relTimer = { 0: 0, 1: 0, 2: 0 };
    var slot = { 0: 'BL', 1: 'BC', 2: 'BR' }; // DOM button index → shim field
    var press = function (b) {
      var f = slot[b];
      if (f === undefined) return;
      clearTimeout(relTimer[b]);
      $impl[f] = true;
    };
    var release = function (b) {
      var f = slot[b];
      if (f === undefined) return;
      clearTimeout(relTimer[b]);
      relTimer[b] = setTimeout(function () { $impl[f] = false; }, GRACE);
    };
    document.addEventListener('mousemove', function (e) {
      track(e);
      // Keep a held button latched while dragging (real hardware sets the mask).
      if (e.buttons & 1) $impl.BL = true;
      if (e.buttons & 2) $impl.BR = true;
      if (e.buttons & 4) $impl.BC = true;
    });
    document.addEventListener('mousedown', function (e) { track(e); press(e.button); });
    document.addEventListener('mouseup', function (e) { track(e); release(e.button); });
    // The games poll LeftButton to "click" menu buttons — context menu on
    // right-click would steal the RightButton presses.
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  };
});
rtl.module("dos",["System"],function () {
  "use strict";
  var $mod = this;
  this.GetTime = function (hour, minute, second, sec100) {
    var now = 0.0;
    var h = 0;
    var m = 0;
    var s = 0;
    var ms = 0;
    now = pas.SysUtils.Time();
    pas.SysUtils.DecodeTime(now,{get: function () {
        return h;
      }, set: function (v) {
        h = v;
      }},{get: function () {
        return m;
      }, set: function (v) {
        m = v;
      }},{get: function () {
        return s;
      }, set: function (v) {
        s = v;
      }},{get: function () {
        return ms;
      }, set: function (v) {
        ms = v;
      }});
    hour.set(h);
    minute.set(m);
    second.set(s);
    sec100.set(Math.floor(ms / 10));
  };
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
  this.Rewrite = function (f) {
    var empty = undefined;
    empty = [];
    $impl.PutLines(f.name,empty);
    f.cursor = 0;
    f.col = 0;
    f.mode = 2;
  };
  this.Erase = function (f) {
    var empty = undefined;
    empty = [];
    $impl.PutLines(f.name,empty);
    f.cursor = 0;
    f.mode = 0;
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
  this.Close = function (f) {
    f.mode = 0;
  };
  this.EofT = function (f) {
    var Result = false;
    var lines = undefined;
    lines = $impl.GetLines(f.name);
    Result = true;
    Result = (lines == null) || (f.cursor >= lines.length);
    return Result;
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
  $impl.PutLines = function (name, lines) {
    // Always record in memory, so a write is readable again in THIS session even
    // when localStorage is unavailable (sandboxed iframe). localStorage on top of
    // that is what makes a write outlive a reload; its failure must not lose data.
    window.__retroMem = window.__retroMem || {};
    window.__retroMem[(window.__retroSlug || 'game') + ':' + name] = lines;
    try { localStorage.setItem('retro:' + (window.__retroSlug || 'game') + ':' + name, JSON.stringify(lines)); } catch (e) {};
  };
});
rtl.module("shifr",["System"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  this.DeShifrovka = function (file1, file2) {
    $impl.CopyText(file1,file2);
  };
  this.Shifrovka = function (file1, file2) {
    $impl.CopyText(file1,file2);
  };
},["tpfiles"],function () {
  "use strict";
  var $mod = this;
  var $impl = $mod.$impl;
  $impl.CopyText = function (src, dst) {
    var fs = pas.tpfiles.Text.$new();
    var fd = pas.tpfiles.Text.$new();
    var s = "";
    pas.tpfiles.Assign(fs,src);
    pas.tpfiles.Reset(fs);
    pas.tpfiles.Assign(fd,dst);
    pas.tpfiles.Rewrite(fd);
    while (!pas.tpfiles.EofT(fs)) {
      pas.tpfiles.ReadlnT(fs,{get: function () {
          return s;
        }, set: function (v) {
          s = v;
        }});
      pas.tpfiles.WritelnT(fd,s);
    };
    pas.tpfiles.Close(fd);
    pas.tpfiles.Close(fs);
  };
});
rtl.module("program",["System","JS","crt","graph","mouse","dos","tpfiles","shifr"],function () {
  "use strict";
  var $mod = this;
  rtl.recNewT($mod,"coordinates",function () {
    this.x = 0;
    this.y = 0;
    this.$eq = function (b) {
      return (this.x === b.x) && (this.y === b.y);
    };
    this.$assign = function (s) {
      this.x = s.x;
      this.y = s.y;
      return this;
    };
  });
  rtl.recNewT($mod,"block",function () {
    this.color = 0;
    this.nx = 0;
    this.ny = 0;
    this.sort = 0;
    this.x = 0;
    this.y = 0;
    this.balls = 0;
    this.here = false;
    this.$eq = function (b) {
      return (this.color === b.color) && (this.nx === b.nx) && (this.ny === b.ny) && (this.sort === b.sort) && (this.x === b.x) && (this.y === b.y) && (this.balls === b.balls) && (this.here === b.here);
    };
    this.$assign = function (s) {
      this.color = s.color;
      this.nx = s.nx;
      this.ny = s.ny;
      this.sort = s.sort;
      this.x = s.x;
      this.y = s.y;
      this.balls = s.balls;
      this.here = s.here;
      return this;
    };
  });
  rtl.recNewT($mod,"player",function () {
    this.name = "";
    this.score = 0;
    this.time = 0;
    this.level = 0;
    this.$eq = function (b) {
      return (this.name === b.name) && (this.score === b.score) && (this.time === b.time) && (this.level === b.level);
    };
    this.$assign = function (s) {
      this.name = s.name;
      this.score = s.score;
      this.time = s.time;
      this.level = s.level;
      return this;
    };
  });
  this.pi180 = Math.PI / 180;
  this.by = 7;
  this.bx = 8;
  this.Colors = ["Чёрный","Синий","Зелёный","Бирюзовый","Красный","Розовый","Коричневый","Светло-серый","Тёмно-серый","Светло-синий","Светло-зелёный","Светло-бирюзовый","Светло-красный","Светло-розовый","Желтый","Белый"];
  this.ball = $mod.coordinates.$new();
  this.fly = $mod.coordinates.$new();
  this.ud = $mod.coordinates.$new();
  this.alfa = 0;
  this.c = 0;
  this.HeroX = 0;
  this.right = false;
  this.left = false;
  this.ng = 0;
  this.nv = 0;
  this.key = "";
  this.radian = 0.0;
  this.ColorBall = 0;
  this.ColorHero = 0;
  this.ColorFon = 0;
  this.ColorMenuFon = 0;
  this.ColorButton = 0;
  this.ColorGameMenu = 0;
  this.ColorMenuText = 0;
  this.ColorGameText = 0;
  this.ColorClock = 0;
  this.ColorSelect = 0;
  this.BallSpeed = 0;
  this.HeroSpeed = 0;
  this.HeroB = 0;
  this.Duration = 0;
  this.Score = 0;
  this.FirstTime = 0;
  this.NowTime = 0;
  this.Time = 0;
  this.Lives = 0;
  this.Level = 0;
  this.blocks = rtl.arraySetLength(null,$mod.block,7,8);
  this.ArrBP = rtl.arraySetLength(null,$mod.player,10);
  this.ArrNBP = rtl.arraySetLength(null,$mod.player,11);
  this.HighSpeedBall = false;
  this.SmallSpeedHero = false;
  this.SmallHero = false;
  this.BigHero = false;
  this.SmallSpeedBall = false;
  this.HighSpeedHero = false;
  this.Shleyf = false;
  this.ShleyfNow = false;
  this.Pushka = false;
  this.Snaryad = false;
  this.Jump = false;
  this.TimeHSB = 0;
  this.TimeSSH = 0;
  this.TimeSH = 0;
  this.TimeBH = 0;
  this.TimeSSB = 0;
  this.TimeHSH = 0;
  this.TimeS = 0;
  this.TimeP = 0;
  this.Sx = 0;
  this.Sy = 0;
  this.Line = 0;
  this.HeroY = 0;
  this.TimeJ = 0.0;
  this.SnSp = 0;
  this.InKey = function () {
    var Result = "";
    if (pas.crt.KeyPressed()) Result = pas.crt.ReadKey();
    return Result;
  };
  this.Clean = function (x1, y1, x2, y2, Color) {
    var i = 0;
    var j = 0;
    for (var $l = x1, $end = x2; $l <= $end; $l++) {
      i = $l;
      for (var $l1 = y1, $end1 = y2; $l1 <= $end1; $l1++) {
        j = $l1;
        pas.graph.PutPixel(i,j,Color);
      };
    };
  };
  this.Sortirovka = function () {
    var i = 0;
    var j = 0;
    var st = "";
    var max = 0.0;
    var m = 0;
    for (i = 1; i <= 11; i++) {
      max = 0;
      for (var $l = i; $l <= 11; $l++) {
        j = $l;
        if ($mod.ArrNBP[j - 1].score > max) {
          max = $mod.ArrNBP[j - 1].score;
          m = $mod.ArrNBP[i - 1].score;
          $mod.ArrNBP[i - 1].score = $mod.ArrNBP[j - 1].score;
          $mod.ArrNBP[j - 1].score = m;
          st = $mod.ArrNBP[i - 1].name;
          $mod.ArrNBP[i - 1].name = $mod.ArrNBP[j - 1].name;
          $mod.ArrNBP[j - 1].name = st;
          m = $mod.ArrNBP[i - 1].level;
          $mod.ArrNBP[i - 1].level = $mod.ArrNBP[j - 1].level;
          $mod.ArrNBP[j - 1].level = m;
          m = $mod.ArrNBP[i - 1].time;
          $mod.ArrNBP[i - 1].time = $mod.ArrNBP[j - 1].time;
          $mod.ArrNBP[j - 1].time = m;
        };
      };
    };
    for (i = 1; i <= 10; i++) {
      $mod.ArrBP[i - 1].name = $mod.ArrNBP[i - 1].name;
      $mod.ArrBP[i - 1].score = $mod.ArrNBP[i - 1].score;
      $mod.ArrBP[i - 1].level = $mod.ArrNBP[i - 1].level;
      $mod.ArrBP[i - 1].time = $mod.ArrNBP[i - 1].time;
    };
  };
  this.BestPlayers = async function () {
    var f = pas.tpfiles.Text.$new();
    var i = 0;
    var j = 0;
    var s = "";
    var k = "";
    $mod.Sortirovka();
    pas.graph.ClearDevice();
    pas.graph.SetColor($mod.ColorMenuFon);
    pas.graph.SetFillStyle(1,$mod.ColorMenuFon);
    pas.graph.Bar(0,0,641,481);
    pas.graph.SetColor($mod.ColorMenuText);
    pas.graph.SetTextStyle(1,0,4);
    pas.graph.OutTextXY(195,1,"Best Players");
    pas.shifr.DeShifrovka("best.cod","best.scr");
    pas.tpfiles.Assign(f,"best.scr");
    pas.tpfiles.Reset(f);
    for (i = 1; i <= 10; i++) for (j = 1; j <= 4; j++) {
      var $tmp = j;
      if ($tmp === 1) {
        pas.tpfiles.ReadlnT(f,{p: $mod.ArrBP[i - 1], get: function () {
            return this.p.name;
          }, set: function (v) {
            this.p.name = v;
          }})}
       else if ($tmp === 2) {
        $mod.ArrBP[i - 1].score = pas.tpfiles.ReadLnNum(f)}
       else if ($tmp === 3) {
        $mod.ArrBP[i - 1].level = pas.tpfiles.ReadLnNum(f)}
       else if ($tmp === 4) $mod.ArrBP[i - 1].time = pas.tpfiles.ReadLnNum(f);
    };
    pas.tpfiles.Erase(f);
    pas.tpfiles.Close(f);
    pas.graph.SetTextStyle(1,0,1);
    pas.graph.OutTextXY(50,40,"Name");
    pas.graph.OutTextXY(250,40,"Score");
    pas.graph.OutTextXY(350,40,"Level");
    pas.graph.OutTextXY(450,40,"Time");
    for (i = 1; i <= 10; i++) {
      s = "" + i;
      pas.graph.OutTextXY(25,(i * 40) + 30,s);
      pas.graph.OutTextXY(50,(i * 40) + 30,$mod.ArrBP[i - 1].name);
      s = "" + $mod.ArrBP[i - 1].score;
      pas.graph.OutTextXY(250,(i * 40) + 30,s);
      s = "" + $mod.ArrBP[i - 1].level;
      pas.graph.OutTextXY(350,(i * 40) + 30,s);
      s = "" + $mod.ArrBP[i - 1].time;
      pas.graph.OutTextXY(450,(i * 40) + 30,s);
    };
    do {
      await pas.crt.Delay(15);
      k = $mod.InKey();
      if (k === "\b") {
        pas.tpfiles.Assign(f,"best.scr");
        pas.tpfiles.Rewrite(f);
        pas.tpfiles.Close(f);
        pas.shifr.Shifrovka("best.scr","best.cod");
        await $mod.BestPlayers();
        return;
      };
    } while (!(k === "\x1B"));
  };
  this.Input = async function () {
    var Result = "";
    var key = "";
    var n = 0;
    var st = "";
    var flag = false;
    pas.graph.ClearDevice();
    pas.graph.SetColor($mod.ColorMenuFon);
    pas.graph.SetFillStyle(1,$mod.ColorMenuFon);
    pas.graph.Bar(0,0,641,481);
    pas.graph.SetColor($mod.ColorMenuText);
    pas.graph.SetTextStyle(1,0,4);
    pas.graph.OutTextXY(175,10,"Congretulations!");
    pas.graph.OutTextXY(10,60,'Your name goes to the "Best Scores"');
    pas.graph.OutTextXY(100,110,"Please enter your name");
    pas.graph.OutTextXY(80,160,"Please not more 15 leters");
    st = "";
    for (n = 1; n <= 255; n++) ;
    pas.graph.SetFillStyle(1,$mod.ColorMenuText);
    n = 0;
    do {
      key = String.fromCharCode(pas.System.Trunc(await pas.crt.ReadKeyA()));
      flag = key === "\x00";
      if (flag) key = String.fromCharCode(pas.System.Trunc(await pas.crt.ReadKeyA()));
      var $tmp = key;
      if ($tmp === "\b") {
        if (!(n === 0)) {
          pas.System.Delete({get: function () {
              return st;
            }, set: function (v) {
              st = v;
            }},n,1);
          n -= 1;
          $mod.Clean(150 + (n * 15),210,175 + (n * 15),250,$mod.ColorMenuFon);
        }}
       else if ((($tmp >= "0") && ($tmp <= "9")) || (($tmp >= "A") && ($tmp <= "Z")) || (($tmp >= "a") && ($tmp <= "z"))) if (!(n === 15) && !flag) {
        st = st + key;
        pas.graph.OutTextXY(150 + (n * 15),210,key);
        n += 1;
      };
    } while (!(key === "\r"));
    Result = st;
    return Result;
  };
  this.NewBestPlayer = async function () {
    var i = 0;
    var j = 0;
    var f = pas.tpfiles.Text.$new();
    var n = "";
    var s = 0;
    var t = 0;
    var l = 0;
    pas.shifr.DeShifrovka("best.cod","best.scr");
    pas.tpfiles.Assign(f,"best.scr");
    pas.tpfiles.Reset(f);
    for (i = 1; i <= 10; i++) for (j = 1; j <= 4; j++) {
      var $tmp = j;
      if ($tmp === 1) {
        pas.tpfiles.ReadlnT(f,{p: $mod.ArrBP[i - 1], get: function () {
            return this.p.name;
          }, set: function (v) {
            this.p.name = v;
          }})}
       else if ($tmp === 2) {
        $mod.ArrBP[i - 1].score = pas.tpfiles.ReadLnNum(f)}
       else if ($tmp === 3) {
        $mod.ArrBP[i - 1].level = pas.tpfiles.ReadLnNum(f)}
       else if ($tmp === 4) $mod.ArrBP[i - 1].time = pas.tpfiles.ReadLnNum(f);
    };
    pas.tpfiles.Erase(f);
    pas.tpfiles.Close(f);
    for (i = 1; i <= 10; i++) {
      $mod.ArrNBP[i - 1].name = $mod.ArrBP[i - 1].name;
      $mod.ArrNBP[i - 1].score = $mod.ArrBP[i - 1].score;
      $mod.ArrNBP[i - 1].level = $mod.ArrBP[i - 1].level;
      $mod.ArrNBP[i - 1].time = $mod.ArrBP[i - 1].time;
    };
    if ($mod.Score > $mod.ArrNBP[9].score) {
      $mod.ArrNBP[10].name = await $mod.Input();
      $mod.ArrNBP[10].score = $mod.Score;
      $mod.ArrNBP[10].level = $mod.Level;
      $mod.ArrNBP[10].time = $mod.Time;
      $mod.Sortirovka();
    };
    for (i = 1; i <= 10; i++) {
      $mod.ArrBP[i - 1].name = $mod.ArrNBP[i - 1].name;
      $mod.ArrBP[i - 1].score = $mod.ArrNBP[i - 1].score;
      $mod.ArrBP[i - 1].level = $mod.ArrNBP[i - 1].level;
      $mod.ArrBP[i - 1].time = $mod.ArrNBP[i - 1].time;
    };
    pas.tpfiles.Assign(f,"best.scr");
    pas.tpfiles.Rewrite(f);
    for (i = 1; i <= 10; i++) {
      n = $mod.ArrBP[i - 1].name;
      s = $mod.ArrBP[i - 1].score;
      l = $mod.ArrBP[i - 1].level;
      t = $mod.ArrBP[i - 1].time;
      for (j = 1; j <= 4; j++) {
        var $tmp1 = j;
        if ($tmp1 === 1) {
          pas.tpfiles.WritelnT(f,n)}
         else if ($tmp1 === 2) {
          pas.tpfiles.WritelnLong(f,s)}
         else if ($tmp1 === 3) {
          pas.tpfiles.WritelnLong(f,l)}
         else if ($tmp1 === 4) pas.tpfiles.WritelnLong(f,t);
      };
    };
    pas.tpfiles.Close(f);
    pas.shifr.Shifrovka("best.scr","best.cod");
    pas.tpfiles.Assign(f,"best.scr");
    pas.tpfiles.Reset(f);
    pas.tpfiles.Erase(f);
    pas.tpfiles.Close(f);
    await $mod.BestPlayers();
  };
  this.GameOver = async function () {
    var s = "";
    pas.graph.ClearDevice();
    pas.graph.SetColor($mod.ColorMenuFon);
    pas.graph.SetFillStyle(1,$mod.ColorMenuFon);
    pas.graph.Bar(0,0,641,481);
    pas.graph.SetColor($mod.ColorMenuText);
    pas.graph.SetTextStyle(1,0,7);
    pas.graph.OutTextXY(135,1,"Game Over");
    pas.graph.SetTextStyle(1,0,5);
    pas.graph.OutTextXY(50,100,"Your score -");
    s = "" + $mod.Score;
    pas.graph.OutTextXY(350,100,s);
    pas.graph.OutTextXY(50,200,"Your level -");
    s = "" + $mod.Level;
    pas.graph.OutTextXY(350,200,s);
    pas.graph.OutTextXY(50,300,"Your time -");
    s = "" + $mod.Time;
    pas.graph.OutTextXY(350,300,s);
    await pas.crt.Delay($mod.Duration * 500);
    await $mod.NewBestPlayer();
  };
  this.MakeBall = function (x, y, radius, color) {
    pas.graph.SetColor(color);
    pas.graph.SetFillStyle(1,color);
    pas.graph.Circle(x,y,radius);
    pas.graph.FloodFill(x,y,color);
  };
  var r = 3;
  this.MakeSnaryad = function (color) {
    pas.graph.SetColor(color);
    pas.graph.SetFillStyle(1,color);
    pas.graph.Circle($mod.Sx,$mod.Sy,3);
    pas.graph.FloodFill($mod.Sx,$mod.Sy,color);
  };
  this.MakeHero = function (color) {
    var HC = 0;
    pas.graph.SetColor(color);
    pas.graph.SetFillStyle(1,color);
    pas.graph.Bar($mod.HeroX,$mod.HeroY,$mod.HeroX + $mod.HeroB,$mod.HeroY + 15);
    HC = $mod.HeroX + Math.floor($mod.HeroB / 2);
    if ($mod.Pushka) pas.graph.Bar(HC - 10,$mod.HeroY - 25,HC + 10,$mod.HeroY);
    if ($mod.Pushka && $mod.Snaryad) {
      $mod.MakeSnaryad($mod.ColorFon);
      $mod.Sy = $mod.Sy - $mod.SnSp;
      $mod.MakeSnaryad($mod.ColorBall);
    };
  };
  this.MakeBlocks = function () {
    var i = 0;
    var j = 0;
    pas.graph.SetColor($mod.ColorFon);
    pas.graph.SetFillStyle(1,$mod.ColorFon);
    pas.graph.Bar(0,0,640,300);
    for (i = 1; i <= 7; i++) for (j = 1; j <= 8; j++) {
      var $with = $mod.blocks[i - 1][j - 1];
      if ($with.here) {
        pas.graph.SetColor(15);
        pas.graph.SetFillStyle(1,$with.color);
        pas.graph.Rectangle($with.x,$with.y,$with.x + 79,$with.y + 19);
        pas.graph.FloodFill($with.x + 1,$with.y + 1,15);
      };
    };
  };
  this.LinePlus = function () {
    var i = 0;
    var j = 0;
    $mod.Line += 1;
    for (i = 1; i <= 7; i++) for (j = 1; j <= 8; j++) {
      if (i === $mod.Line) $mod.blocks[i - 1][j - 1].here = true;
    };
    $mod.MakeBlocks();
  };
  this.udar = function () {
    var Result = false;
    Result = false;
    if ($mod.ball.x <= 7) {
      Result = true;
      $mod.ng = 1;
      $mod.MakeBall($mod.ball.x,$mod.ball.y,5,$mod.ColorFon);
      $mod.ball.x = 8;
    };
    if ($mod.ball.x >= 633) {
      Result = true;
      $mod.ng = -1;
      $mod.MakeBall($mod.ball.x,$mod.ball.y,5,$mod.ColorFon);
      $mod.ball.x = 632;
    };
    if ($mod.ball.y <= 7) {
      Result = true;
      $mod.nv = 1;
      $mod.MakeBall($mod.ball.x,$mod.ball.y,5,$mod.ColorFon);
      $mod.ball.y = 8;
    };
    if ($mod.ball.y >= ($mod.HeroY + 10)) {
      Result = true;
      $mod.nv = -1;
      $mod.MakeBall($mod.ball.x,$mod.ball.y,5,$mod.ColorFon);
      $mod.ball.y = $mod.HeroY + 9;
      $mod.Lives -= 1;
      $mod.Clean(105,435,125,480,$mod.ColorGameMenu);
      $mod.LinePlus();
    };
    if ((Math.abs($mod.ball.y - $mod.HeroY) <= 5) && ($mod.ball.x >= $mod.HeroX) && ($mod.ball.x <= ($mod.HeroX + $mod.HeroB))) {
      Result = true;
      $mod.MakeBall($mod.ball.x,$mod.ball.y,5,$mod.ColorFon);
      $mod.nv = -1;
      $mod.ball.y = $mod.HeroY - 6;
      if ($mod.Jump) {
        $mod.alfa = $mod.alfa * 2;
      } else if (((($mod.ball.x - $mod.HeroX) <= 10) || (($mod.HeroX - $mod.ball.x) <= 10)) && !$mod.ShleyfNow) {
        if ($mod.left) if ($mod.ng === 1) {
          $mod.ng = -1}
         else $mod.alfa = Math.floor($mod.alfa / 2);
        if ($mod.right) if ($mod.ng === -1) {
          $mod.ng = 1}
         else $mod.alfa = Math.floor($mod.alfa / 2);
      } else {
        if ($mod.left) if ($mod.ng === 1) {
          $mod.alfa = $mod.alfa + 3}
         else $mod.alfa = $mod.alfa - 3;
        if ($mod.right) if ($mod.ng === -1) {
          $mod.alfa = $mod.alfa + 3}
         else $mod.alfa = $mod.alfa - 3;
      };
    };
    if ($mod.Shleyf) {
      if ($mod.left) {
        if ((Math.abs($mod.HeroY - $mod.ball.y) <= 20) && ($mod.ball.x >= ($mod.HeroX + $mod.HeroB)) && ($mod.ball.x <= ($mod.HeroX + $mod.HeroB + $mod.HeroSpeed))) {
          Result = true;
          $mod.MakeBall($mod.ball.x,$mod.ball.y,5,$mod.ColorFon);
          $mod.nv = -1;
          $mod.ball.y = $mod.HeroY - 21;
          if ((($mod.ball.x - $mod.HeroX) <= 10) || (($mod.HeroX - $mod.ball.x) <= 10)) {
            if ($mod.ng === 1) {
              $mod.ng = -1}
             else $mod.alfa = Math.floor($mod.alfa / 2);
          } else {
            if ($mod.ng === 1) {
              $mod.alfa = $mod.alfa + 3}
             else $mod.alfa = $mod.alfa - 3;
          };
        };
      };
      if ($mod.right) {
        if ((Math.abs($mod.ball.y - $mod.HeroY) <= 20) && ($mod.ball.x >= ($mod.HeroX - $mod.HeroSpeed)) && ($mod.ball.x <= $mod.HeroX)) {
          Result = true;
          $mod.MakeBall($mod.ball.x,$mod.ball.y,5,$mod.ColorFon);
          $mod.nv = -1;
          $mod.ball.y = $mod.HeroY - 21;
          if ((($mod.ball.x - $mod.HeroX) <= 10) || (($mod.HeroX - $mod.ball.x) <= 10)) {
            if ($mod.ng === -1) {
              $mod.ng = 1}
             else $mod.alfa = Math.floor($mod.alfa / 2);
          } else {
            if ($mod.ng === -1) {
              $mod.alfa = $mod.alfa + 3}
             else $mod.alfa = $mod.alfa - 3;
          };
        };
      };
    };
    return Result;
  };
  this.GameText = function () {
    var s = "";
    var h = 0;
    var m = 0;
    var sec = 0;
    var d = 0;
    pas.graph.SetColor($mod.ColorGameText);
    pas.graph.SetTextStyle(7,0,3);
    pas.graph.OutTextXY(10,435,"Lives - ");
    s = "" + $mod.Lives;
    pas.graph.OutTextXY(105,435,s);
    pas.graph.OutTextXY(125,435,"Level -");
    s = "" + $mod.Level;
    pas.graph.OutTextXY(220,435,s);
    pas.graph.OutTextXY(240,435,"Score -");
    s = "" + $mod.Score;
    pas.graph.OutTextXY(335,435,s);
    pas.graph.OutTextXY(450,435,"Time -");
    pas.dos.GetTime({get: function () {
        return h;
      }, set: function (v) {
        h = v;
      }},{get: function () {
        return m;
      }, set: function (v) {
        m = v;
      }},{get: function () {
        return sec;
      }, set: function (v) {
        sec = v;
      }},{get: function () {
        return d;
      }, set: function (v) {
        d = v;
      }});
    $mod.NowTime = sec + (m * 60) + (h * 3600);
    if (($mod.NowTime - $mod.FirstTime) > $mod.Time) {
      $mod.Time = $mod.NowTime - $mod.FirstTime;
      s = "" + ($mod.NowTime - $mod.FirstTime);
      $mod.Clean(550,435,640,460,$mod.ColorGameMenu);
      pas.graph.OutTextXY(550,435,s);
    };
  };
  this.InitBlocks = function () {
    var i = 0;
    var j = 0;
    for (i = 1; i <= 7; i++) for (j = 1; j <= 8; j++) {
      var $with = $mod.blocks[i - 1][j - 1];
      $with.sort = pas.System.Random(14) + 1;
      var $tmp = $with.sort;
      if ($tmp === 1) {
        $with.color = 0}
       else if ($tmp === 2) {
        $with.color = 4}
       else if ($tmp === 3) {
        $with.color = 5}
       else if ($tmp === 4) {
        $with.color = 12}
       else if ($tmp === 5) {
        $with.color = 13}
       else if ($tmp === 6) {
        $with.color = 6}
       else if ($tmp === 7) {
        $with.color = 7}
       else if ($tmp === 8) {
        $with.color = 1}
       else if ($tmp === 9) {
        $with.color = 2}
       else if ($tmp === 10) {
        $with.color = 9}
       else if ($tmp === 11) {
        $with.color = 10}
       else if ($tmp === 12) {
        $with.color = 14}
       else if ($tmp === 13) $with.color = 15;
      var $tmp1 = $with.sort;
      if (($tmp1 >= 1) && ($tmp1 <= 10)) {
        $with.balls = $with.sort * 100}
       else if ($tmp1 === 11) {
        $with.balls = 1500}
       else if ($tmp1 === 12) {
        $with.balls = 2500}
       else if ($tmp1 === 13) $with.balls = 5000;
      if (i === 1) {
        $with.here = true}
       else $with.here = false;
      $mod.Line = 1;
      $with.nx = j;
      $with.ny = i;
      $with.x = (j - 1) * 80;
      $with.y = (i - 1) * 20;
    };
  };
  var a0 = 50;
  this.BlockUdar = function () {
    var Result = false;
    var i = 0;
    var j = 0;
    var u = false;
    var h = 0;
    var m = 0;
    var s = 0;
    var d = 0;
    var iu = 0;
    var ju = 0;
    var x = 0;
    var y = 0;
    u = false;
    for (i = 1; i <= 7; i++) for (j = 1; j <= 8; j++) if ($mod.blocks[i - 1][j - 1].here && !u) {
      if (($mod.Sx > $mod.blocks[i - 1][j - 1].x) && ($mod.Sx < ($mod.blocks[i - 1][j - 1].x + 78)) && (Math.abs($mod.Sy - ($mod.blocks[i - 1][j - 1].y + 19)) <= 10) && $mod.Snaryad && $mod.Pushka) {
        x = $mod.blocks[i - 1][j - 1].x;
        y = $mod.blocks[i - 1][j - 1].y;
        pas.graph.SetColor($mod.ColorFon);
        pas.graph.SetFillStyle(1,$mod.ColorFon);
        pas.graph.Rectangle(x,y,x + 79,y + 20);
        pas.graph.FloodFill(x + 1,y + 1,$mod.ColorFon);
        if ($mod.blocks[i - 1][j - 1].sort === 1) $mod.Clean(x,y,x + 79,y + 50,$mod.ColorFon);
        $mod.blocks[i - 1][j - 1].here = false;
        $mod.Score = $mod.Score + $mod.blocks[i - 1][j - 1].balls;
        $mod.Clean(335,435,449,480,$mod.ColorGameMenu);
        $mod.Snaryad = false;
        $mod.MakeSnaryad($mod.ColorFon);
        iu = i;
        ju = j;
      };
      if (($mod.ball.x > $mod.blocks[i - 1][j - 1].x) && ($mod.ball.x < ($mod.blocks[i - 1][j - 1].x + 78)) && (Math.abs($mod.ball.y - ($mod.blocks[i - 1][j - 1].y + 19)) <= 10) && !u) {
        x = $mod.blocks[i - 1][j - 1].x;
        y = $mod.blocks[i - 1][j - 1].y;
        pas.graph.SetColor($mod.ColorFon);
        pas.graph.SetFillStyle(1,$mod.ColorFon);
        pas.graph.Rectangle(x,y,x + 79,y + 20);
        pas.graph.FloodFill(x + 1,y + 1,$mod.ColorFon);
        if ($mod.blocks[i - 1][j - 1].sort === 1) $mod.Clean(x,y,x + 79,y + 50,$mod.ColorFon);
        $mod.blocks[i - 1][j - 1].here = false;
        $mod.Score = $mod.Score + $mod.blocks[i - 1][j - 1].balls;
        $mod.Clean(335,435,449,480,$mod.ColorGameMenu);
        $mod.nv = 1;
        $mod.MakeBall($mod.ball.x,$mod.ball.y,5,$mod.ColorFon);
        $mod.ball.y = $mod.blocks[i - 1][j - 1].y + 11;
        u = true;
        $mod.ball.y = $mod.blocks[i - 1][j - 1].y + 30;
        iu = i;
        ju = j;
      };
      if (($mod.ball.x > $mod.blocks[i - 1][j - 1].x) && ($mod.ball.x < ($mod.blocks[i - 1][j - 1].x + 78)) && (Math.abs($mod.ball.y - $mod.blocks[i - 1][j - 1].y) <= 10) && !u) {
        x = $mod.blocks[i - 1][j - 1].x;
        y = $mod.blocks[i - 1][j - 1].y;
        pas.graph.SetColor($mod.ColorFon);
        pas.graph.SetFillStyle(1,$mod.ColorFon);
        pas.graph.Rectangle(x,y,x + 79,y + 20);
        pas.graph.FloodFill(x + 1,y + 1,$mod.ColorFon);
        if ($mod.blocks[i - 1][j - 1].sort === 1) $mod.Clean(x,y,x + 79,y + 50,$mod.ColorFon);
        $mod.blocks[i - 1][j - 1].here = false;
        $mod.Score = $mod.Score + $mod.blocks[i - 1][j - 1].balls;
        $mod.Clean(335,435,449,480,$mod.ColorGameMenu);
        $mod.nv = -1;
        $mod.MakeBall($mod.ball.x,$mod.ball.y,5,$mod.ColorFon);
        $mod.ball.y = $mod.blocks[i - 1][j - 1].y + 11;
        u = true;
        $mod.ball.y = $mod.blocks[i - 1][j - 1].y - 10;
        iu = i;
        ju = j;
      };
      if (($mod.ball.y > $mod.blocks[i - 1][j - 1].y) && ($mod.ball.y < ($mod.blocks[i - 1][j - 1].y + 19)) && (Math.abs($mod.ball.x - $mod.blocks[i - 1][j - 1].x) <= 10) && !u) {
        x = $mod.blocks[i - 1][j - 1].x;
        y = $mod.blocks[i - 1][j - 1].y;
        pas.graph.SetColor($mod.ColorFon);
        pas.graph.SetFillStyle(1,$mod.ColorFon);
        pas.graph.Rectangle(x,y,x + 79,y + 20);
        pas.graph.FloodFill(x + 1,y + 1,$mod.ColorFon);
        if ($mod.blocks[i - 1][j - 1].sort === 1) $mod.Clean(x,y,x + 79,y + 50,$mod.ColorFon);
        $mod.blocks[i - 1][j - 1].here = false;
        $mod.Score = $mod.Score + $mod.blocks[i - 1][j - 1].balls;
        $mod.Clean(335,435,449,480,$mod.ColorGameMenu);
        $mod.ng = -1;
        $mod.MakeBall($mod.ball.x,$mod.ball.y,5,$mod.ColorFon);
        $mod.ball.y = $mod.blocks[i - 1][j - 1].y + 11;
        u = true;
        $mod.ball.x = $mod.blocks[i - 1][j - 1].x - 10;
        iu = i;
        ju = j;
      };
      if (($mod.ball.y > $mod.blocks[i - 1][j - 1].y) && ($mod.ball.y < ($mod.blocks[i - 1][j - 1].y + 19)) && (Math.abs($mod.ball.x - ($mod.blocks[i - 1][j - 1].x + 78)) <= 10) && !u) {
        x = $mod.blocks[i - 1][j - 1].x;
        y = $mod.blocks[i - 1][j - 1].y;
        pas.graph.SetColor($mod.ColorFon);
        pas.graph.SetFillStyle(1,$mod.ColorFon);
        pas.graph.Rectangle(x,y,x + 79,y + 20);
        pas.graph.FloodFill(x + 1,y + 1,$mod.ColorFon);
        if ($mod.blocks[i - 1][j - 1].sort === 1) $mod.Clean(x,y,x + 79,y + 50,$mod.ColorFon);
        $mod.blocks[i - 1][j - 1].here = false;
        $mod.Score = $mod.Score + $mod.blocks[i - 1][j - 1].balls;
        $mod.Clean(335,435,449,480,$mod.ColorGameMenu);
        $mod.ng = 1;
        $mod.MakeBall($mod.ball.x,$mod.ball.y,5,$mod.ColorFon);
        $mod.ball.y = $mod.blocks[i - 1][j - 1].y + 11;
        u = true;
        $mod.ball.x = $mod.blocks[i - 1][j - 1].x + 90;
        iu = i;
        ju = j;
      };
    };
    Result = u;
    $mod.MakeHero($mod.ColorFon);
    if (u) {
      var $tmp = $mod.blocks[iu - 1][ju - 1].sort;
      if ($tmp === 1) {}
      else if ($tmp === 2) {
        $mod.HighSpeedBall = true;
        pas.dos.GetTime({get: function () {
            return h;
          }, set: function (v) {
            h = v;
          }},{get: function () {
            return m;
          }, set: function (v) {
            m = v;
          }},{get: function () {
            return s;
          }, set: function (v) {
            s = v;
          }},{get: function () {
            return d;
          }, set: function (v) {
            d = v;
          }});
        $mod.TimeHSB = s + (m * 60) + (h * 3600);
        $mod.BallSpeed = Math.floor(($mod.BallSpeed * 5) / 4);
      } else if ($tmp === 3) {
        $mod.SmallSpeedHero = true;
        pas.dos.GetTime({get: function () {
            return h;
          }, set: function (v) {
            h = v;
          }},{get: function () {
            return m;
          }, set: function (v) {
            m = v;
          }},{get: function () {
            return s;
          }, set: function (v) {
            s = v;
          }},{get: function () {
            return d;
          }, set: function (v) {
            d = v;
          }});
        $mod.TimeSSH = s + (m * 60) + (h * 3600);
        $mod.HeroSpeed = Math.floor(($mod.HeroSpeed * 2) / 3);
      } else if ($tmp === 4) {
        $mod.SmallHero = true;
        pas.dos.GetTime({get: function () {
            return h;
          }, set: function (v) {
            h = v;
          }},{get: function () {
            return m;
          }, set: function (v) {
            m = v;
          }},{get: function () {
            return s;
          }, set: function (v) {
            s = v;
          }},{get: function () {
            return d;
          }, set: function (v) {
            d = v;
          }});
        $mod.TimeSH = s + (m * 60) + (h * 3600);
        pas.graph.SetColor($mod.ColorFon);
        pas.graph.SetFillStyle(1,$mod.ColorFon);
        pas.graph.Bar($mod.HeroX,$mod.HeroY,$mod.HeroX + $mod.HeroB,$mod.HeroY + 25);
        $mod.HeroB = Math.floor(($mod.HeroB * 2) / 3);
      } else if ($tmp === 5) {}
      else if ($tmp === 6) {}
      else if ($tmp === 7) {
        $mod.BigHero = true;
        pas.dos.GetTime({get: function () {
            return h;
          }, set: function (v) {
            h = v;
          }},{get: function () {
            return m;
          }, set: function (v) {
            m = v;
          }},{get: function () {
            return s;
          }, set: function (v) {
            s = v;
          }},{get: function () {
            return d;
          }, set: function (v) {
            d = v;
          }});
        $mod.TimeBH = s + (m * 60) + (h * 3600);
        $mod.HeroB = Math.floor(($mod.HeroB * 3) / 2);
      } else if ($tmp === 8) {
        $mod.SmallSpeedBall = true;
        pas.dos.GetTime({get: function () {
            return h;
          }, set: function (v) {
            h = v;
          }},{get: function () {
            return m;
          }, set: function (v) {
            m = v;
          }},{get: function () {
            return s;
          }, set: function (v) {
            s = v;
          }},{get: function () {
            return d;
          }, set: function (v) {
            d = v;
          }});
        $mod.TimeSSB = s + (m * 60) + (h * 3600);
        $mod.BallSpeed = Math.floor(($mod.BallSpeed * 4) / 5);
      } else if ($tmp === 9) {
        $mod.HighSpeedHero = true;
        pas.dos.GetTime({get: function () {
            return h;
          }, set: function (v) {
            h = v;
          }},{get: function () {
            return m;
          }, set: function (v) {
            m = v;
          }},{get: function () {
            return s;
          }, set: function (v) {
            s = v;
          }},{get: function () {
            return d;
          }, set: function (v) {
            d = v;
          }});
        $mod.TimeHSH = s + (m * 60) + (h * 3600);
        $mod.HeroSpeed = Math.floor(($mod.HeroSpeed * 3) / 2);
      } else if ($tmp === 10) {
        $mod.Shleyf = true;
        pas.dos.GetTime({get: function () {
            return h;
          }, set: function (v) {
            h = v;
          }},{get: function () {
            return m;
          }, set: function (v) {
            m = v;
          }},{get: function () {
            return s;
          }, set: function (v) {
            s = v;
          }},{get: function () {
            return d;
          }, set: function (v) {
            d = v;
          }});
        $mod.TimeS = s + (m * 60) + (h * 3600);
      } else if ($tmp === 11) {
        $mod.Pushka = true;
        pas.dos.GetTime({get: function () {
            return h;
          }, set: function (v) {
            h = v;
          }},{get: function () {
            return m;
          }, set: function (v) {
            m = v;
          }},{get: function () {
            return s;
          }, set: function (v) {
            s = v;
          }},{get: function () {
            return d;
          }, set: function (v) {
            d = v;
          }});
        $mod.TimeP = s + (m * 60) + (h * 3600);
      } else if ($tmp === 12) {}
      else if ($tmp === 13) {
        $mod.Clean(105,435,125,480,$mod.ColorGameMenu);
        $mod.Lives += 1;
      };
    };
    $mod.MakeHero($mod.ColorHero);
    return Result;
  };
  var b = 7;
  this.Bonus = async function () {
    var h = 0;
    var m = 0;
    var s = 0;
    var d = 0;
    var time = 0;
    var f = pas.tpfiles.Text.$new();
    $mod.MakeHero($mod.ColorFon);
    if ($mod.HighSpeedBall) {
      pas.dos.GetTime({get: function () {
          return h;
        }, set: function (v) {
          h = v;
        }},{get: function () {
          return m;
        }, set: function (v) {
          m = v;
        }},{get: function () {
          return s;
        }, set: function (v) {
          s = v;
        }},{get: function () {
          return d;
        }, set: function (v) {
          d = v;
        }});
      time = s + (m * 60) + (h * 3600);
      if ((time - $mod.TimeHSB) >= 7) {
        $mod.HighSpeedBall = false;
        pas.tpfiles.Assign(f,"options.opt");
        pas.tpfiles.Reset(f);
        for (h = 1; h <= 11; h++) $mod.BallSpeed = pas.tpfiles.ReadLnNum(f);
        pas.tpfiles.Close(f);
      };
    };
    if ($mod.SmallSpeedHero) {
      pas.dos.GetTime({get: function () {
          return h;
        }, set: function (v) {
          h = v;
        }},{get: function () {
          return m;
        }, set: function (v) {
          m = v;
        }},{get: function () {
          return s;
        }, set: function (v) {
          s = v;
        }},{get: function () {
          return d;
        }, set: function (v) {
          d = v;
        }});
      time = s + (m * 60) + (h * 3600);
      if ((time - $mod.TimeSSH) >= 7) {
        $mod.SmallSpeedHero = false;
        pas.tpfiles.Assign(f,"options.opt");
        pas.tpfiles.Reset(f);
        for (h = 1; h <= 12; h++) if (h === 12) $mod.HeroSpeed = pas.tpfiles.ReadLnNum(f);
        pas.tpfiles.Close(f);
      };
    };
    if ($mod.SmallHero) {
      pas.dos.GetTime({get: function () {
          return h;
        }, set: function (v) {
          h = v;
        }},{get: function () {
          return m;
        }, set: function (v) {
          m = v;
        }},{get: function () {
          return s;
        }, set: function (v) {
          s = v;
        }},{get: function () {
          return d;
        }, set: function (v) {
          d = v;
        }});
      time = s + (m * 60) + (h * 3600);
      if ((time - $mod.TimeSH) >= 7) {
        $mod.SmallHero = false;
        pas.tpfiles.Assign(f,"options.opt");
        pas.tpfiles.Reset(f);
        for (h = 1; h <= 13; h++) $mod.HeroB = pas.tpfiles.ReadLnNum(f);
        pas.tpfiles.Close(f);
      };
    };
    if ($mod.BigHero) {
      pas.dos.GetTime({get: function () {
          return h;
        }, set: function (v) {
          h = v;
        }},{get: function () {
          return m;
        }, set: function (v) {
          m = v;
        }},{get: function () {
          return s;
        }, set: function (v) {
          s = v;
        }},{get: function () {
          return d;
        }, set: function (v) {
          d = v;
        }});
      time = s + (m * 60) + (h * 3600);
      if ((time - $mod.TimeBH) >= 7) {
        $mod.BigHero = false;
        pas.graph.SetColor($mod.ColorFon);
        pas.graph.SetFillStyle(1,$mod.ColorFon);
        pas.graph.Bar($mod.HeroX,$mod.HeroY,$mod.HeroX + $mod.HeroB,$mod.HeroY + 25);
        pas.tpfiles.Assign(f,"options.opt");
        pas.tpfiles.Reset(f);
        for (h = 1; h <= 13; h++) $mod.HeroB = pas.tpfiles.ReadLnNum(f);
        pas.tpfiles.Close(f);
      };
    };
    if ($mod.SmallSpeedBall) {
      pas.dos.GetTime({get: function () {
          return h;
        }, set: function (v) {
          h = v;
        }},{get: function () {
          return m;
        }, set: function (v) {
          m = v;
        }},{get: function () {
          return s;
        }, set: function (v) {
          s = v;
        }},{get: function () {
          return d;
        }, set: function (v) {
          d = v;
        }});
      time = s + (m * 60) + (h * 3600);
      if ((time - $mod.TimeSSB) >= 7) {
        $mod.SmallSpeedBall = false;
        pas.tpfiles.Assign(f,"options.opt");
        pas.tpfiles.Reset(f);
        for (h = 1; h <= 11; h++) $mod.BallSpeed = pas.tpfiles.ReadLnNum(f);
        pas.tpfiles.Close(f);
      };
    };
    if ($mod.HighSpeedHero) {
      pas.dos.GetTime({get: function () {
          return h;
        }, set: function (v) {
          h = v;
        }},{get: function () {
          return m;
        }, set: function (v) {
          m = v;
        }},{get: function () {
          return s;
        }, set: function (v) {
          s = v;
        }},{get: function () {
          return d;
        }, set: function (v) {
          d = v;
        }});
      time = s + (m * 60) + (h * 3600);
      if ((time - $mod.TimeSSH) >= 7) {
        $mod.HighSpeedHero = false;
        pas.tpfiles.Assign(f,"options.opt");
        pas.tpfiles.Reset(f);
        for (h = 1; h <= 12; h++) $mod.HeroSpeed = pas.tpfiles.ReadLnNum(f);
        pas.tpfiles.Close(f);
      };
    };
    if ($mod.Shleyf) {
      pas.dos.GetTime({get: function () {
          return h;
        }, set: function (v) {
          h = v;
        }},{get: function () {
          return m;
        }, set: function (v) {
          m = v;
        }},{get: function () {
          return s;
        }, set: function (v) {
          s = v;
        }},{get: function () {
          return d;
        }, set: function (v) {
          d = v;
        }});
      time = s + (m * 60) + (h * 3600);
      if ((time - $mod.TimeS) >= 7) {
        $mod.Shleyf = false;
        pas.graph.SetColor(0);
        pas.graph.SetFillStyle(1,0);
        pas.graph.Bar(0,$mod.HeroY,641,$mod.HeroY + 15);
      };
    };
    if ($mod.Pushka) {
      pas.dos.GetTime({get: function () {
          return h;
        }, set: function (v) {
          h = v;
        }},{get: function () {
          return m;
        }, set: function (v) {
          m = v;
        }},{get: function () {
          return s;
        }, set: function (v) {
          s = v;
        }},{get: function () {
          return d;
        }, set: function (v) {
          d = v;
        }});
      time = s + (m * 60) + (h * 3600);
      if ((time - $mod.TimeP) >= 7) {
        $mod.Pushka = false;
        $mod.Snaryad = false;
        pas.graph.SetColor(0);
        pas.graph.SetFillStyle(1,0);
        pas.graph.Bar(0,$mod.HeroY - 50,641,$mod.HeroY + 15);
        $mod.MakeSnaryad($mod.ColorFon);
        $mod.MakeHero($mod.ColorFon);
      };
    };
    $mod.MakeHero($mod.ColorHero);
  };
  this.Pause = function () {
    pas.mouse.HideMouse();
    pas.graph.SetColor(4);
    pas.graph.SetFillStyle(1,7);
    pas.graph.Rectangle(205,200,405,270);
    pas.graph.FloodFill(206,201,4);
    pas.graph.SetTextStyle(2,0,10);
    pas.graph.OutTextXY(245,208,"Pause");
    pas.mouse.ShowMouse();
  };
  this.NoPause = function () {
    pas.mouse.HideMouse();
    pas.graph.SetColor(0);
    pas.graph.SetFillStyle(1,0);
    pas.graph.Bar(205,200,405,270);
    pas.mouse.ShowMouse();
  };
  this.LineWork = function (newlevel) {
    var flag = false;
    var i = 0;
    var j = 0;
    flag = true;
    for (i = 1; i <= 7; i++) for (j = 1; j <= 8; j++) flag = flag && !$mod.blocks[i - 1][j - 1].here;
    newlevel.set(false);
    if (flag) {
      $mod.Clean(220,435,240,450,$mod.ColorGameMenu);
      $mod.Level += 1;
      newlevel.set(true);
      for (var $l = 1, $end = $mod.Level; $l <= $end; $l++) {
        i = $l;
        for (j = 1; j <= 8; j++) $mod.blocks[i - 1][j - 1].here = true;
      };
    };
  };
  this.SWork = function () {
    if ((Math.abs($mod.Sx - $mod.ball.x) <= 10) && (Math.abs($mod.Sy - $mod.ball.y) <= 10)) {
      $mod.alfa = 90;
      $mod.nv = -1;
      $mod.SnSp = -5;
    };
    if (($mod.Sy - $mod.HeroY) >= 25) {
      $mod.Snaryad = false;
      $mod.MakeSnaryad($mod.ColorFon);
    };
  };
  this.BallWalking = async function (flag, f) {
    var h = 0;
    var m = 0;
    var s = 0;
    var d = 0;
    var T = 0.0;
    $mod.Time = 0;
    pas.graph.SetColor(0);
    pas.graph.SetFillStyle(1,0);
    pas.graph.Bar(145,160,465,310);
    $mod.MakeBlocks();
    do {
      $mod.c = 1;
      $mod.MakeBall($mod.ball.x,$mod.ball.y,5,0);
      if ($mod.alfa > 90) {
        $mod.alfa = $mod.alfa - 90;
        $mod.ng = -$mod.ng;
      };
      if ($mod.alfa < 1) {
        $mod.alfa = 180 - $mod.alfa;
        $mod.nv = -$mod.nv;
      };
      $mod.ud.x = $mod.ball.x;
      $mod.ud.y = $mod.ball.y;
      do {
        $mod.MakeBall($mod.ball.x,$mod.ball.y,5,$mod.ColorFon);
        if ($mod.BlockUdar()) $mod.MakeBlocks();
        $mod.radian = $mod.pi180 * $mod.alfa;
        $mod.fly.y = pas.System.Trunc($mod.c * Math.sin($mod.radian));
        $mod.fly.x = pas.System.Trunc($mod.c * Math.cos($mod.radian));
        $mod.ball.x = $mod.ud.x + ($mod.fly.x * $mod.ng);
        $mod.ball.y = $mod.ud.y + ($mod.fly.y * $mod.nv);
        $mod.c = $mod.c + $mod.BallSpeed;
        $mod.key = $mod.InKey();
        var $tmp = $mod.key;
        if ($tmp === "K") {
          $mod.left = true;
          $mod.right = false;
        } else if ($tmp === "M") {
          $mod.right = true;
          $mod.left = false;
        } else if (($tmp === "P") || ($tmp === "p")) {
          $mod.Pause();
          do {
          } while (!pas.crt.KeyPressed());
          $mod.NoPause();
        } else if (($tmp === "B") || ($tmp === "b")) {
          if ($mod.Pushka && !$mod.Snaryad) {
            $mod.Snaryad = true;
            $mod.Sy = $mod.HeroY - 5;
            $mod.Sx = $mod.HeroX + Math.floor($mod.HeroB / 2);
            $mod.SnSp = 5;
          }}
         else if ($tmp === " ") {
          $mod.MakeHero($mod.ColorFon);
          $mod.Jump = true;
          $mod.HeroY = $mod.HeroY - 5;
          pas.dos.GetTime({get: function () {
              return h;
            }, set: function (v) {
              h = v;
            }},{get: function () {
              return m;
            }, set: function (v) {
              m = v;
            }},{get: function () {
              return s;
            }, set: function (v) {
              s = v;
            }},{get: function () {
              return d;
            }, set: function (v) {
              d = v;
            }});
          $mod.TimeJ = s + (m * 60) + (h * 3600) + (d / 100);
        };
        pas.dos.GetTime({get: function () {
            return h;
          }, set: function (v) {
            h = v;
          }},{get: function () {
            return m;
          }, set: function (v) {
            m = v;
          }},{get: function () {
            return s;
          }, set: function (v) {
            s = v;
          }},{get: function () {
            return d;
          }, set: function (v) {
            d = v;
          }});
        T = s + (m * 60) + (h * 3600) + (d / 100);
        if ($mod.Jump) {
          $mod.MakeHero($mod.ColorFon);
          $mod.HeroY = $mod.HeroY - 5;
        };
        if ($mod.Jump && ((T - $mod.TimeJ) >= 0.25)) {
          $mod.MakeHero($mod.ColorFon);
          $mod.Jump = false;
          $mod.HeroY = 400;
        };
        if ($mod.Pushka && $mod.Snaryad) $mod.SWork();
        $mod.MakeHero($mod.ColorFon);
        if ($mod.left) $mod.HeroX = $mod.HeroX - $mod.HeroSpeed;
        if ($mod.right) $mod.HeroX = $mod.HeroX + $mod.HeroSpeed;
        if ($mod.HeroX <= 1) $mod.HeroX = 1;
        if ($mod.HeroX >= (640 - $mod.HeroB)) $mod.HeroX = 641 - $mod.HeroB;
        if (($mod.HeroX <= 1) || ($mod.HeroX >= 540)) {
          $mod.left = false;
          $mod.right = false;
        };
        if ($mod.Shleyf) {
          $mod.ShleyfNow = false;
          pas.graph.SetColor($mod.ColorFon);
          pas.graph.SetFillStyle(1,$mod.ColorFon);
          pas.graph.Bar(0,$mod.HeroY,641,$mod.HeroY + 15);
          if ($mod.left) {
            $mod.ShleyfNow = true;
            pas.graph.SetColor($mod.ColorHero);
            pas.graph.SetFillStyle(9,$mod.ColorHero);
            pas.graph.Bar($mod.HeroX + $mod.HeroB,$mod.HeroY,$mod.HeroX + $mod.HeroB + ($mod.HeroSpeed * 7),$mod.HeroY + 15);
          };
          if ($mod.right) {
            $mod.ShleyfNow = true;
            pas.graph.SetColor($mod.ColorHero);
            pas.graph.SetFillStyle(9,$mod.ColorHero);
            pas.graph.Bar($mod.HeroX - ($mod.HeroSpeed * 7),$mod.HeroY,$mod.HeroX,$mod.HeroY + 15);
          };
        };
        $mod.MakeHero($mod.ColorHero);
        $mod.MakeBall($mod.ball.x,$mod.ball.y,5,$mod.ColorBall);
        await pas.crt.Delay($mod.Duration * 2);
        await $mod.Bonus();
        $mod.LineWork(f);
        $mod.GameText();
      } while (!($mod.udar() || ($mod.key === "\x1B") || $mod.BlockUdar() || f.get()));
    } while (!(($mod.key === "\x1B") || ($mod.Lives === 0) || f.get()));
    if ($mod.Lives === 0) await $mod.GameOver();
    flag.set(false);
    if ($mod.key === "\x1B") flag.set(true);
  };
  this.SureLeave = async function () {
    var Result = false;
    var number = 0;
    var num = 0;
    var choice = 0;
    var x = 0;
    var key = "";
    pas.mouse.HideMouse();
    pas.graph.SetColor(4);
    pas.graph.SetFillStyle(1,7);
    pas.graph.Rectangle(145,160,465,310);
    pas.graph.FloodFill(146,161,4);
    pas.graph.SetTextStyle(2,0,8);
    pas.graph.OutTextXY(175,175,"Are you sure want");
    pas.graph.OutTextXY(170,210,"to leave this game?");
    pas.graph.SetFillStyle(1,4);
    pas.graph.Bar(185,265,260,295);
    pas.graph.Bar(320,265,395,295);
    pas.graph.SetColor(15);
    pas.graph.OutTextXY(202,265,"Yes");
    pas.graph.OutTextXY(345,265,"No");
    number = 1;
    choice = 0;
    pas.mouse.ShowMouse();
    pas.mouse.ShowMouse();
    do {
      num = number;
      pas.graph.SetColor($mod.ColorSelect);
      var $tmp = number;
      if ($tmp === 1) {
        x = 185}
       else if ($tmp === 2) x = 320;
      pas.graph.Rectangle(x,265,x + 75,295);
      num = number;
      if ((pas.mouse.MouseX() > 185) && (pas.mouse.MouseX() < 260) && (pas.mouse.MouseY() > 265) && (pas.mouse.MouseY() < 295)) {
        var $tmp1 = pas.mouse.LeftButton();
        if ($tmp1 === true) {
          choice = number}
         else if ($tmp1 === false) num = 1;
      };
      if ((pas.mouse.MouseX() > 320) && (pas.mouse.MouseX() < 395) && (pas.mouse.MouseY() > 265) && (pas.mouse.MouseY() < 295)) {
        var $tmp2 = pas.mouse.LeftButton();
        if ($tmp2 === true) {
          choice = number}
         else if ($tmp2 === false) num = 2;
      };
      await pas.crt.Delay(15);
      key = $mod.InKey();
      var $tmp3 = key;
      if ($tmp3 === "K") {
        num -= 1}
       else if ($tmp3 === "M") num += 1;
      if (num === 0) num = 2;
      if (num === 3) num = 1;
      if (num !== number) {
        pas.graph.SetColor(7);
        pas.graph.Rectangle(x,265,x + 75,295);
        number = num;
      };
      if (key === "\r") choice = number;
    } while (!(choice !== 0));
    if (choice === 1) {
      Result = true}
     else Result = false;
    return Result;
  };
  this.Game = async function () {
    var f = pas.tpfiles.Text.$new();
    var flag = false;
    var esc = false;
    var nl = false;
    var ran = 0;
    pas.graph.ClearDevice();
    $mod.ShleyfNow = false;
    pas.tpfiles.Assign(f,"options.opt");
    pas.tpfiles.Reset(f);
    $mod.ColorBall = pas.tpfiles.ReadLnNum(f);
    $mod.ColorHero = pas.tpfiles.ReadLnNum(f);
    $mod.ColorFon = pas.tpfiles.ReadLnNum(f);
    $mod.ColorMenuFon = pas.tpfiles.ReadLnNum(f);
    $mod.ColorButton = pas.tpfiles.ReadLnNum(f);
    $mod.ColorGameMenu = pas.tpfiles.ReadLnNum(f);
    $mod.ColorMenuText = pas.tpfiles.ReadLnNum(f);
    $mod.ColorGameText = pas.tpfiles.ReadLnNum(f);
    $mod.ColorClock = pas.tpfiles.ReadLnNum(f);
    $mod.ColorSelect = pas.tpfiles.ReadLnNum(f);
    $mod.BallSpeed = pas.tpfiles.ReadLnNum(f);
    $mod.HeroSpeed = pas.tpfiles.ReadLnNum(f);
    $mod.HeroB = pas.tpfiles.ReadLnNum(f);
    $mod.Duration = pas.tpfiles.ReadLnNum(f);
    pas.tpfiles.Close(f);
    $mod.HighSpeedBall = false;
    $mod.SmallSpeedHero = false;
    $mod.SmallHero = false;
    $mod.BigHero = false;
    $mod.SmallSpeedBall = false;
    $mod.HighSpeedHero = false;
    $mod.Shleyf = false;
    $mod.Jump = false;
    $mod.Pushka = false;
    $mod.Snaryad = false;
    $mod.HeroY = 400;
    pas.graph.SetColor($mod.ColorFon);
    pas.graph.SetFillStyle(1,$mod.ColorFon);
    pas.graph.Bar(0,0,641,$mod.HeroY + 25);
    pas.graph.SetColor($mod.ColorGameMenu);
    pas.graph.SetFillStyle(1,$mod.ColorGameMenu);
    pas.graph.Bar(0,$mod.HeroY + 26,641,481);
    $mod.HeroX = 100;
    $mod.nv = -1;
    ran = pas.System.Random(100) + 1;
    var $tmp = ran;
    if (($tmp >= 1) && ($tmp <= 50)) {
      $mod.ng = 1}
     else {
      $mod.ng = -1;
    };
    $mod.alfa = pas.System.Random(56) + 30;
    $mod.ball.x = 150;
    $mod.ball.y = 350;
    $mod.HeroX = 100;
    $mod.right = false;
    $mod.left = false;
    flag = false;
    do {
      $mod.Time = 0;
      nl = false;
      $mod.BallWalking({get: function () {
          return esc;
        }, set: function (v) {
          esc = v;
        }},{get: function () {
          return nl;
        }, set: function (v) {
          nl = v;
        }});
      if (nl) await $mod.Game();
      if (esc) flag = await $mod.SureLeave();
    } while (!(flag || !esc));
    pas.tpfiles.Assign(f,"options.opt");
    pas.tpfiles.Reset(f);
    $mod.ColorBall = pas.tpfiles.ReadLnNum(f);
    $mod.ColorHero = pas.tpfiles.ReadLnNum(f);
    $mod.ColorFon = pas.tpfiles.ReadLnNum(f);
    $mod.ColorMenuFon = pas.tpfiles.ReadLnNum(f);
    $mod.ColorButton = pas.tpfiles.ReadLnNum(f);
    $mod.ColorGameMenu = pas.tpfiles.ReadLnNum(f);
    $mod.ColorMenuText = pas.tpfiles.ReadLnNum(f);
    $mod.ColorGameText = pas.tpfiles.ReadLnNum(f);
    $mod.ColorClock = pas.tpfiles.ReadLnNum(f);
    $mod.ColorSelect = pas.tpfiles.ReadLnNum(f);
    $mod.BallSpeed = pas.tpfiles.ReadLnNum(f);
    $mod.HeroSpeed = pas.tpfiles.ReadLnNum(f);
    $mod.HeroB = pas.tpfiles.ReadLnNum(f);
    $mod.Duration = pas.tpfiles.ReadLnNum(f);
    pas.tpfiles.Close(f);
  };
  this.Information = async function () {
    var inffile = pas.tpfiles.Text.$new();
    var i = 0;
    var str = "";
    var gd = 0;
    var gm = 0;
    var ErrorCode = 0;
    pas.graph.CloseGraph();
    pas.crt.TextBackground($mod.ColorMenuFon);
    pas.crt.ClrScr();
    pas.crt.TextColor($mod.ColorMenuText);
    pas.tpfiles.Assign(inffile,"readme.hlp");
    pas.tpfiles.Reset(inffile);
    for (i = 1; i <= 24; i++) {
      pas.tpfiles.ReadlnT(inffile,{get: function () {
          return str;
        }, set: function (v) {
          str = v;
        }});
      if (i !== 4) {
        pas.System.Writeln(str)}
       else pas.System.Write(str);
    };
    pas.System.Write("Нажмите Esc для возврата в меню");
    do {
    } while (!(String.fromCharCode(pas.System.Trunc(await pas.crt.ReadKeyA())) === "\x1B"));
    pas.tpfiles.Close(inffile);
    gd = 0;
    pas.graph.InitGraph({get: function () {
        return gd;
      }, set: function (v) {
        gd = v;
      }},{get: function () {
        return gm;
      }, set: function (v) {
        gm = v;
      }},"");
    ErrorCode = pas.graph.GraphResult();
    if (ErrorCode !== 0) {
      pas.crt.ClrScr();
      pas.System.Writeln("Error:",pas.graph.GraphErrorMsg(ErrorCode));
      pas.crt.Readln();
    };
  };
  this.OptionsText = function () {
    pas.crt.ClrScr();
    pas.crt.GotoXY(35,1);
    pas.System.Write("Настройки");
    pas.crt.GotoXY(1,3);
    pas.System.Writeln("     Цвет мяча - ",$mod.Colors[$mod.ColorBall]);
    pas.System.Writeln("     Цвет доски - ",$mod.Colors[$mod.ColorHero]);
    pas.System.Writeln("     Цвет фона в игровом поле - ",$mod.Colors[$mod.ColorFon]);
    pas.System.Writeln("     Цвет фона меню - ",$mod.Colors[$mod.ColorMenuFon]);
    pas.System.Writeln("     Цвет кнопок - ",$mod.Colors[$mod.ColorButton]);
    pas.System.Writeln("     Цвет фона меню в игре - ",$mod.Colors[$mod.ColorGameMenu]);
    pas.System.Writeln("     Цвет текста в меню - ",$mod.Colors[$mod.ColorMenuText]);
    pas.System.Writeln("     Цвет текста в игре - ",$mod.Colors[$mod.ColorGameText]);
    pas.System.Writeln("     Цвет часов - ",$mod.Colors[$mod.ColorClock]);
    pas.System.Writeln("     Цвет рамки выбора - ",$mod.Colors[$mod.ColorSelect]);
    pas.System.Writeln("     Скорость мяча - ",$mod.BallSpeed," пикселей за один ход");
    pas.System.Writeln("     Скорость доски - ",$mod.HeroSpeed," пикселей за один ход");
    pas.System.Writeln("     Ширина доски - ",$mod.HeroB," пикселей");
    pas.System.Writeln("     Задержка - ",$mod.Duration," милисекунд");
    pas.System.Writeln("     Вернуть по умолчанию");
  };
  this.Change = async function (n) {
    var st = "";
    var s = "";
    var m = 0;
    var f = false;
    var fl = false;
    f = false;
    fl = true;
    do {
      if (fl) {
        pas.crt.GotoXY(15,20);
        pas.System.Write("                                                  ");
        pas.crt.GotoXY(15,20);
        var $tmp = n;
        if ($tmp === 1) {
          st = "     Цвет мяча - " + $mod.Colors[$mod.ColorBall]}
         else if ($tmp === 2) {
          st = "     Цвет доски - " + $mod.Colors[$mod.ColorHero]}
         else if ($tmp === 3) {
          st = "     Цвет фона в игровом поле - " + $mod.Colors[$mod.ColorFon]}
         else if ($tmp === 4) {
          st = "     Цвет фона меню - " + $mod.Colors[$mod.ColorMenuFon]}
         else if ($tmp === 5) {
          st = "     Цвет кнопок - " + $mod.Colors[$mod.ColorButton]}
         else if ($tmp === 6) {
          st = "     Цвет фона меню в игре - " + $mod.Colors[$mod.ColorGameMenu]}
         else if ($tmp === 7) {
          st = "     Цвет текста в меню - " + $mod.Colors[$mod.ColorMenuText]}
         else if ($tmp === 8) {
          st = "     Цвет текста в игре - " + $mod.Colors[$mod.ColorGameText]}
         else if ($tmp === 9) {
          st = "     Цвет часов - " + $mod.Colors[$mod.ColorClock]}
         else if ($tmp === 10) {
          st = "     Цвет рамки выбора - " + $mod.Colors[$mod.ColorSelect]}
         else if ($tmp === 11) {
          s = "" + $mod.BallSpeed;
          st = "     Скорость мяча - " + s + " пикселей за один ход";
        } else if ($tmp === 12) {
          s = "" + $mod.HeroSpeed;
          st = "     Скорость доски - " + s + " пикселей за один ход";
        } else if ($tmp === 13) {
          s = "" + $mod.HeroB;
          st = "     Ширина доски - " + s + " пикселей";
        } else if ($tmp === 14) {
          s = "" + $mod.Duration;
          st = "     Задержка - " + s + " милисекунд";
        };
        pas.System.Write(st);
        pas.crt.GotoXY(80,25);
        fl = false;
      };
      var $tmp1 = n;
      if ($tmp1 === 1) {
        m = $mod.ColorBall}
       else if ($tmp1 === 2) {
        m = $mod.ColorHero}
       else if ($tmp1 === 3) {
        m = $mod.ColorFon}
       else if ($tmp1 === 4) {
        m = $mod.ColorMenuFon}
       else if ($tmp1 === 5) {
        m = $mod.ColorButton}
       else if ($tmp1 === 6) {
        m = $mod.ColorGameMenu}
       else if ($tmp1 === 7) {
        m = $mod.ColorMenuText}
       else if ($tmp1 === 8) {
        m = $mod.ColorGameText}
       else if ($tmp1 === 9) {
        m = $mod.ColorClock}
       else if ($tmp1 === 10) {
        m = $mod.ColorSelect}
       else if ($tmp1 === 11) {
        m = $mod.BallSpeed}
       else if ($tmp1 === 12) {
        m = $mod.HeroSpeed}
       else if ($tmp1 === 13) {
        m = $mod.HeroB}
       else if ($tmp1 === 14) m = $mod.Duration;
      await pas.crt.Delay(15);
      var $tmp2 = $mod.InKey();
      if ($tmp2 === "H") {
        m += 1;
        fl = true;
      } else if ($tmp2 === "P") {
        m -= 1;
        fl = true;
      } else if ($tmp2 === "\r") f = true;
      if (n <= 10) {
        if (m === 16) m = 0;
        if (m === -1) m = 15;
      } else if (m === 0) m = 1;
      if (n === 13) if (m > 640) m = 640;
      var $tmp3 = n;
      if ($tmp3 === 1) {
        $mod.ColorBall = m}
       else if ($tmp3 === 2) {
        $mod.ColorHero = m}
       else if ($tmp3 === 3) {
        $mod.ColorFon = m}
       else if ($tmp3 === 4) {
        $mod.ColorMenuFon = m}
       else if ($tmp3 === 5) {
        $mod.ColorButton = m}
       else if ($tmp3 === 6) {
        $mod.ColorGameMenu = m}
       else if ($tmp3 === 7) {
        $mod.ColorMenuText = m}
       else if ($tmp3 === 8) {
        $mod.ColorGameText = m}
       else if ($tmp3 === 9) {
        $mod.ColorClock = m}
       else if ($tmp3 === 10) {
        $mod.ColorSelect = m}
       else if ($tmp3 === 11) {
        $mod.BallSpeed = m}
       else if ($tmp3 === 12) {
        $mod.HeroSpeed = m}
       else if ($tmp3 === 13) {
        $mod.HeroB = m}
       else if ($tmp3 === 14) $mod.Duration = m;
    } while (!f);
    pas.crt.GotoXY(15,20);
    pas.System.Write("                                                  ");
    pas.crt.TextBackground($mod.ColorMenuFon);
    pas.crt.TextColor($mod.ColorMenuText);
    $mod.OptionsText();
  };
  this.Default = function () {
    var Fi = pas.tpfiles.Text.$new();
    pas.shifr.DeShifrovka("default.cod","default.opt");
    pas.tpfiles.Assign(Fi,"default.opt");
    pas.tpfiles.Reset(Fi);
    $mod.ColorBall = pas.tpfiles.ReadLnNum(Fi);
    $mod.ColorHero = pas.tpfiles.ReadLnNum(Fi);
    $mod.ColorFon = pas.tpfiles.ReadLnNum(Fi);
    $mod.ColorMenuFon = pas.tpfiles.ReadLnNum(Fi);
    $mod.ColorButton = pas.tpfiles.ReadLnNum(Fi);
    $mod.ColorGameMenu = pas.tpfiles.ReadLnNum(Fi);
    $mod.ColorMenuText = pas.tpfiles.ReadLnNum(Fi);
    $mod.ColorGameText = pas.tpfiles.ReadLnNum(Fi);
    $mod.ColorClock = pas.tpfiles.ReadLnNum(Fi);
    $mod.ColorSelect = pas.tpfiles.ReadLnNum(Fi);
    $mod.BallSpeed = pas.tpfiles.ReadLnNum(Fi);
    $mod.HeroSpeed = pas.tpfiles.ReadLnNum(Fi);
    $mod.HeroB = pas.tpfiles.ReadLnNum(Fi);
    $mod.Duration = pas.tpfiles.ReadLnNum(Fi);
    pas.tpfiles.Erase(Fi);
    pas.tpfiles.Close(Fi);
    $mod.OptionsText();
  };
  this.Options = async function () {
    var fil = pas.tpfiles.Text.$new();
    var gd = 0;
    var gm = 0;
    var errorcode = 0;
    var n = 0;
    var flag = false;
    pas.graph.CloseGraph();
    pas.crt.TextBackground($mod.ColorMenuFon);
    pas.crt.TextColor($mod.ColorMenuText);
    $mod.OptionsText();
    n = 3;
    flag = false;
    do {
      pas.crt.GotoXY(3,n);
      pas.System.Write("*");
      pas.crt.GotoXY(80,25);
      var $tmp = String.fromCharCode(pas.System.Trunc(await pas.crt.ReadKeyA()));
      if ($tmp === "H") {
        pas.crt.GotoXY(3,n);
        pas.System.Write(" ");
        n -= 1;
      } else if ($tmp === "P") {
        pas.crt.GotoXY(3,n);
        pas.System.Writeln(" ");
        n += 1;
      } else if ($tmp === "\r") {
        if (n !== 17) {
          await $mod.Change(n - 2)}
         else $mod.Default()}
       else if ($tmp === "\x1B") flag = true;
      if (n === 2) n = 17;
      if (n === 18) n = 3;
    } while (!flag);
    pas.tpfiles.Assign(fil,"options.opt");
    pas.tpfiles.Rewrite(fil);
    pas.tpfiles.WritelnLong(fil,$mod.ColorBall);
    pas.tpfiles.WritelnLong(fil,$mod.ColorHero);
    pas.tpfiles.WritelnLong(fil,$mod.ColorFon);
    pas.tpfiles.WritelnLong(fil,$mod.ColorMenuFon);
    pas.tpfiles.WritelnLong(fil,$mod.ColorButton);
    pas.tpfiles.WritelnLong(fil,$mod.ColorGameMenu);
    pas.tpfiles.WritelnLong(fil,$mod.ColorMenuText);
    pas.tpfiles.WritelnLong(fil,$mod.ColorGameText);
    pas.tpfiles.WritelnLong(fil,$mod.ColorClock);
    pas.tpfiles.WritelnLong(fil,$mod.ColorSelect);
    pas.tpfiles.WritelnLong(fil,$mod.BallSpeed);
    pas.tpfiles.WritelnLong(fil,$mod.HeroSpeed);
    pas.tpfiles.WritelnLong(fil,$mod.HeroB);
    pas.tpfiles.WritelnLong(fil,$mod.Duration);
    pas.tpfiles.Close(fil);
    gd = 0;
    pas.graph.InitGraph({get: function () {
        return gd;
      }, set: function (v) {
        gd = v;
      }},{get: function () {
        return gm;
      }, set: function (v) {
        gm = v;
      }},"");
    errorcode = pas.graph.GraphResult();
    if (errorcode !== 0) {
      pas.crt.ClrScr();
      pas.System.Writeln("Error:",pas.graph.GraphErrorMsg(errorcode));
      pas.crt.Readln();
    };
  };
  this.ButtonPress = async function (n) {
    var x = 0;
    var y = 0;
    var s = "";
    pas.mouse.HideMouse();
    var $tmp = n;
    if ($tmp === 1) {
      y = 10}
     else if ($tmp === 2) {
      y = 110}
     else if ($tmp === 3) {
      y = 210}
     else if ($tmp === 4) {
      y = 310}
     else if ($tmp === 5) y = 410;
    pas.graph.SetColor($mod.ColorMenuFon);
    pas.graph.SetFillStyle(1,$mod.ColorMenuFon);
    pas.graph.Bar(100,y,300,y + 50);
    pas.graph.SetColor(0);
    pas.graph.SetFillStyle(1,0);
    pas.graph.Bar(105,y + 5,305,y + 55);
    pas.graph.SetColor(15);
    pas.graph.SetTextStyle(3,0,4);
    var $tmp1 = n;
    if ($tmp1 === 1) {
      s = "Start game"}
     else if ($tmp1 === 2) {
      s = "Best players"}
     else if ($tmp1 === 3) {
      s = "Options"}
     else if ($tmp1 === 4) {
      s = "Information"}
     else if ($tmp1 === 5) s = "Quit";
    var $tmp2 = n;
    if (($tmp2 === 1) || ($tmp2 === 4)) {
      x = 125}
     else if ($tmp2 === 2) {
      x = 115}
     else if ($tmp2 === 3) {
      x = 155}
     else if ($tmp2 === 5) x = 175;
    pas.graph.OutTextXY(x + 5,y + 5,s);
    pas.mouse.ShowMouse();
    await pas.crt.Delay($mod.Duration * 7);
  };
  this.SureExit = async function () {
    var Result = false;
    var number = 0;
    var num = 0;
    var choice = 0;
    var x = 0;
    var key = "";
    pas.mouse.HideMouse();
    pas.graph.SetColor(4);
    pas.graph.SetFillStyle(1,7);
    pas.graph.Rectangle(145,160,465,310);
    pas.graph.FloodFill(146,161,4);
    pas.graph.SetTextStyle(2,0,8);
    pas.graph.OutTextXY(175,175,"Are you sure want");
    pas.graph.OutTextXY(175,210,"to quit this game?");
    pas.graph.SetFillStyle(1,4);
    pas.graph.Bar(185,265,260,295);
    pas.graph.Bar(320,265,395,295);
    pas.graph.SetColor(15);
    pas.graph.OutTextXY(202,265,"Yes");
    pas.graph.OutTextXY(345,265,"No");
    number = 1;
    choice = 0;
    pas.mouse.ShowMouse();
    pas.mouse.ShowMouse();
    do {
      num = number;
      pas.graph.SetColor($mod.ColorSelect);
      var $tmp = number;
      if ($tmp === 1) {
        x = 185}
       else if ($tmp === 2) x = 320;
      pas.graph.Rectangle(x,265,x + 75,295);
      num = number;
      if ((pas.mouse.MouseX() > 185) && (pas.mouse.MouseX() < 260) && (pas.mouse.MouseY() > 265) && (pas.mouse.MouseY() < 295)) {
        var $tmp1 = pas.mouse.LeftButton();
        if ($tmp1 === true) {
          choice = number}
         else if ($tmp1 === false) num = 1;
      };
      if ((pas.mouse.MouseX() > 320) && (pas.mouse.MouseX() < 395) && (pas.mouse.MouseY() > 265) && (pas.mouse.MouseY() < 295)) {
        var $tmp2 = pas.mouse.LeftButton();
        if ($tmp2 === true) {
          choice = number}
         else if ($tmp2 === false) num = 2;
      };
      await pas.crt.Delay(15);
      key = $mod.InKey();
      var $tmp3 = key;
      if ($tmp3 === "K") {
        num -= 1}
       else if ($tmp3 === "M") num += 1;
      if (num === 0) num = 2;
      if (num === 3) num = 1;
      if (num !== number) {
        pas.graph.SetColor(7);
        pas.graph.Rectangle(x,265,x + 75,295);
        number = num;
      };
      if (key === "\r") choice = number;
    } while (!(choice !== 0));
    if (choice === 1) {
      Result = true}
     else Result = false;
    return Result;
  };
  this.MainMenu = async function () {
    var Result = 0;
    var color = 0;
    var choice = 0;
    var radius = 0;
    var n = 0;
    var flag = false;
    var h = 0;
    var m = 0;
    var s = 0;
    var d = 0;
    var sec = 0;
    var st = "";
    var year = 0;
    var month = 0;
    var day = 0;
    var dayofweek = 0;
    var date = 0;
    var x = 0;
    var number = 0;
    var num = 0;
    pas.mouse.HideMouse();
    pas.graph.ClearDevice();
    color = $mod.ColorMenuFon;
    pas.graph.SetColor(color);
    pas.graph.SetFillStyle(1,color);
    pas.graph.Bar(0,0,641,481);
    color = $mod.ColorButton;
    pas.graph.SetColor(color);
    pas.graph.SetFillStyle(1,color);
    pas.graph.Bar(100,10,300,60);
    pas.graph.Bar(100,110,300,160);
    pas.graph.Bar(100,210,300,260);
    pas.graph.Bar(100,310,300,360);
    pas.graph.Bar(100,410,300,460);
    color = $mod.ColorMenuText;
    pas.graph.SetColor(color);
    pas.graph.SetTextStyle(3,0,4);
    pas.graph.OutTextXY(120,10,"Start game");
    pas.graph.OutTextXY(110,110,"Best players");
    pas.graph.OutTextXY(150,210,"Options");
    pas.graph.OutTextXY(120,310,"Information");
    pas.graph.OutTextXY(170,410,"Quit");
    pas.graph.SetTextStyle(4,1,7);
    pas.graph.OutTextXY(10,20,"B L O C K S");
    pas.graph.OutTextXY(300,20,"B L O C K S");
    pas.graph.SetTextStyle(7,0,1);
    pas.graph.OutTextXY(437,375,"Copyright by");
    pas.graph.OutTextXY(412,400,"Yermilov Yaroslav");
    choice = 0;
    pas.mouse.InitMouse();
    pas.mouse.ShowMouse();
    color = 0;
    date = 0;
    number = 1;
    pas.mouse.ShowMouse();
    pas.mouse.ShowMouse();
    do {
      radius = 1;
      n = 1;
      do {
        color = pas.System.Random(16);
      } while (!(color !== $mod.ColorMenuFon));
      pas.graph.SetColor(color);
      pas.graph.SetFillStyle(1,color);
      do {
        pas.graph.SetColor($mod.ColorSelect);
        pas.graph.Rectangle(100,(number * 100) - 90,300,(number * 100) - 40);
        await pas.crt.Delay(15);
        var $tmp = $mod.InKey();
        if ($tmp === "H") {
          pas.graph.SetColor($mod.ColorMenuFon);
          pas.graph.Rectangle(100,(number * 100) - 90,300,(number * 100) - 40);
          number -= 1;
        } else if ($tmp === "P") {
          pas.graph.SetColor($mod.ColorMenuFon);
          pas.graph.Rectangle(100,(number * 100) - 90,300,(number * 100) - 40);
          number += 1;
        } else if ($tmp === "\r") choice = number;
        if (number === 0) number = 5;
        if (number === 6) number = 1;
        num = number;
        if ((pas.mouse.MouseX() > 100) && (pas.mouse.MouseX() < 300) && (pas.mouse.MouseY() > 10) && (pas.mouse.MouseY() < 460)) {
          if ((pas.mouse.MouseY() > 10) && (pas.mouse.MouseY() < 60)) num = 1;
          if ((pas.mouse.MouseY() > 110) && (pas.mouse.MouseY() < 160)) num = 2;
          if ((pas.mouse.MouseY() > 210) && (pas.mouse.MouseY() < 260)) num = 3;
          if ((pas.mouse.MouseY() > 310) && (pas.mouse.MouseY() < 360)) num = 4;
          if ((pas.mouse.MouseY() > 410) && (pas.mouse.MouseY() < 460)) num = 5;
        };
        if (num !== number) {
          pas.graph.SetColor($mod.ColorMenuFon);
          pas.graph.Rectangle(100,(number * 100) - 90,300,(number * 100) - 40);
          number = num;
        };
        if ((pas.mouse.MouseX() > 100) && (pas.mouse.MouseX() < 300) && (pas.mouse.MouseY() > 10) && (pas.mouse.MouseY() < 460) && pas.mouse.LeftButton()) {
          if ((pas.mouse.MouseY() > 10) && (pas.mouse.MouseY() < 60)) choice = 1;
          if ((pas.mouse.MouseY() > 110) && (pas.mouse.MouseY() < 160)) choice = 2;
          if ((pas.mouse.MouseY() > 210) && (pas.mouse.MouseY() < 260)) choice = 3;
          if ((pas.mouse.MouseY() > 310) && (pas.mouse.MouseY() < 360)) choice = 4;
          if ((pas.mouse.MouseY() > 410) && (pas.mouse.MouseY() < 460)) choice = 5;
        };
        if (choice !== 0) $mod.ButtonPress(choice);
        flag = false;
        if (((pas.mouse.MouseX() > 375) && (pas.mouse.MouseX() < 625) && (pas.mouse.MouseY() > 125) && (pas.mouse.MouseY() < 375)) || ((pas.mouse.MouseX() > 350) && (pas.mouse.MouseX() < 460) && (pas.mouse.MouseY() > 435) && (pas.mouse.MouseY() < 480))) flag = true;
        if (flag) pas.mouse.HideMouse();
        pas.graph.SetColor(color);
        pas.graph.Circle(500,250,radius);
        radius = radius + n;
        if (radius > 125) {
          color = $mod.ColorMenuFon;
          n = -1;
        };
        if (flag) pas.mouse.ShowMouse();
        pas.dos.GetTime({get: function () {
            return h;
          }, set: function (v) {
            h = v;
          }},{get: function () {
            return m;
          }, set: function (v) {
            m = v;
          }},{get: function () {
            return s;
          }, set: function (v) {
            s = v;
          }},{get: function () {
            return d;
          }, set: function (v) {
            d = v;
          }});
        if ((s + (m * 60) + (h * 3600)) !== sec) $mod.Clean(440,435,550,480,$mod.ColorMenuFon);
        sec = s + (m * 60) + (h * 3600);
        pas.graph.SetColor($mod.ColorClock);
        pas.graph.SetTextStyle(3,0,3);
        st = "" + h;
        if (h < 10) st = "0" + st;
        pas.graph.OutTextXY(440,435,st);
        pas.graph.OutTextXY(470,435,":");
        st = "" + m;
        if (m < 10) st = "0" + st;
        pas.graph.OutTextXY(480,435,st);
        pas.graph.OutTextXY(510,435,":");
        st = "" + s;
        if (s < 10) st = "0" + st;
        pas.graph.OutTextXY(520,435,st);
        pas.dos.GetDate({get: function () {
            return year;
          }, set: function (v) {
            year = v;
          }},{get: function () {
            return month;
          }, set: function (v) {
            month = v;
          }},{get: function () {
            return day;
          }, set: function (v) {
            day = v;
          }},{get: function () {
            return dayofweek;
          }, set: function (v) {
            dayofweek = v;
          }});
        if ((day + (month * 31) + (year * 365)) !== date) {
          date = day + (month * 31) + (year * 365);
          $mod.Clean(420,40,640,150,$mod.ColorMenuFon);
        };
        pas.graph.OutTextXY(450,10,"Today is");
        var $tmp1 = dayofweek;
        if ($tmp1 === 0) {
          st = "Sunday"}
         else if ($tmp1 === 1) {
          st = "Monday"}
         else if ($tmp1 === 2) {
          st = "Tuesday"}
         else if ($tmp1 === 3) {
          st = "Wednesday"}
         else if ($tmp1 === 4) {
          st = "Thursday"}
         else if ($tmp1 === 5) {
          st = "Friday"}
         else if ($tmp1 === 6) st = "Saturday";
        var $tmp2 = dayofweek;
        if ($tmp2 === 0) {
          x = 459}
         else if ($tmp2 === 1) {
          x = 459}
         else if ($tmp2 === 2) {
          x = 454}
         else if ($tmp2 === 3) {
          x = 440}
         else if ($tmp2 === 4) {
          x = 447}
         else if ($tmp2 === 5) {
          x = 465}
         else if ($tmp2 === 6) x = 450;
        pas.graph.OutTextXY(x,40,st);
        var $tmp3 = month;
        if (($tmp3 === 1) || ($tmp3 === 10)) {
          x = 435}
         else if (($tmp3 === 2) || ($tmp3 === 11) || ($tmp3 === 12)) {
          x = 430}
         else if ($tmp3 === 3) {
          x = 445}
         else if ($tmp3 === 4) {
          x = 450}
         else if (($tmp3 === 5) || ($tmp3 === 7)) {
          x = 457}
         else if ($tmp3 === 6) {
          x = 453}
         else if ($tmp3 === 8) {
          x = 440}
         else if ($tmp3 === 9) x = 420;
        st = "" + day;
        pas.graph.OutTextXY(x,70,st);
        var $tmp4 = month;
        if ($tmp4 === 1) {
          st = "January"}
         else if ($tmp4 === 2) {
          st = "February"}
         else if ($tmp4 === 3) {
          st = "March"}
         else if ($tmp4 === 4) {
          st = "April"}
         else if ($tmp4 === 5) {
          st = "May"}
         else if ($tmp4 === 6) {
          st = "June"}
         else if ($tmp4 === 7) {
          st = "July"}
         else if ($tmp4 === 8) {
          st = "August"}
         else if ($tmp4 === 9) {
          st = "September"}
         else if ($tmp4 === 10) {
          st = "October"}
         else if ($tmp4 === 11) {
          st = "November"}
         else if ($tmp4 === 12) st = "December";
        pas.graph.OutTextXY(x + 40,70,st);
        st = "" + year;
        pas.graph.OutTextXY(465,100,st);
        await pas.crt.Delay(Math.floor($mod.Duration / 2));
      } while (!((radius <= 0) || (choice !== 0)));
      color += 1;
    } while (!(choice !== 0));
    Result = choice;
    pas.mouse.HideMouse();
    return Result;
  };
  this.InitPingPong = async function () {
    var errorcode = 0;
    var gd = 0;
    var gm = 0;
    var result = 0;
    var f = pas.tpfiles.Text.$new();
    var flag = false;
    var h = 0;
    var m = 0;
    var s = 0;
    var d = 0;
    gd = 0;
    pas.crt.Randomize();
    pas.graph.InitGraph({get: function () {
        return gd;
      }, set: function (v) {
        gd = v;
      }},{get: function () {
        return gm;
      }, set: function (v) {
        gm = v;
      }},"");
    errorcode = pas.graph.GraphResult();
    pas.shifr.DeShifrovka("options.cod","options.opt");
    pas.tpfiles.Assign(f,"options.opt");
    pas.tpfiles.Reset(f);
    $mod.ColorBall = pas.tpfiles.ReadLnNum(f);
    $mod.ColorHero = pas.tpfiles.ReadLnNum(f);
    $mod.ColorFon = pas.tpfiles.ReadLnNum(f);
    $mod.ColorMenuFon = pas.tpfiles.ReadLnNum(f);
    $mod.ColorButton = pas.tpfiles.ReadLnNum(f);
    $mod.ColorGameMenu = pas.tpfiles.ReadLnNum(f);
    $mod.ColorMenuText = pas.tpfiles.ReadLnNum(f);
    $mod.ColorGameText = pas.tpfiles.ReadLnNum(f);
    $mod.ColorClock = pas.tpfiles.ReadLnNum(f);
    $mod.ColorSelect = pas.tpfiles.ReadLnNum(f);
    $mod.BallSpeed = pas.tpfiles.ReadLnNum(f);
    $mod.HeroSpeed = pas.tpfiles.ReadLnNum(f);
    $mod.HeroB = pas.tpfiles.ReadLnNum(f);
    $mod.Duration = pas.tpfiles.ReadLnNum(f);
    pas.tpfiles.Close(f);
    $mod.HighSpeedBall = false;
    $mod.SmallSpeedHero = false;
    $mod.SmallHero = false;
    $mod.BigHero = false;
    $mod.SmallSpeedBall = false;
    $mod.HighSpeedHero = false;
    $mod.Pushka = false;
    $mod.Snaryad = false;
    flag = false;
    $mod.HeroY = 400;
    if (errorcode === 0) {
      do {
        await pas.crt.Delay($mod.Duration * 40);
        result = 0;
        result = await $mod.MainMenu();
        var $tmp = result;
        if ($tmp === 1) {
          $mod.InitBlocks();
          pas.dos.GetTime({get: function () {
              return h;
            }, set: function (v) {
              h = v;
            }},{get: function () {
              return m;
            }, set: function (v) {
              m = v;
            }},{get: function () {
              return s;
            }, set: function (v) {
              s = v;
            }},{get: function () {
              return d;
            }, set: function (v) {
              d = v;
            }});
          $mod.FirstTime = s + (m * 60) + (h * 3600);
          $mod.Level = 1;
          $mod.Lives = 3;
          $mod.Score = 0;
          await $mod.Game();
        } else if ($tmp === 2) {
          await $mod.BestPlayers()}
         else if ($tmp === 3) {
          await $mod.Options()}
         else if ($tmp === 4) await $mod.Information();
        if (result === 5) flag = await $mod.SureExit();
      } while (!((result === 5) && flag));
      pas.graph.CloseGraph();
      pas.shifr.Shifrovka("options.opt","options.cod");
      pas.tpfiles.Assign(f,"options.opt");
      pas.tpfiles.Reset(f);
      pas.tpfiles.Erase(f);
      pas.tpfiles.Close(f);
    } else {
      pas.crt.ClrScr();
      pas.System.Writeln("Error:",pas.graph.GraphErrorMsg(errorcode));
      pas.crt.Readln();
    };
  };
  this.Main = async function () {
    await $mod.InitPingPong();
  };
  $mod.$main = function () {
    $mod.Main();
  };
});
