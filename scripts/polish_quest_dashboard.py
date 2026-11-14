#!/usr/bin/env python3
"""Render expanded Quest details as a separate readable panel instead of a clipped row subtitle."""
from pathlib import Path
target=Path(__file__).resolve().parents[1]/"patches/src/main/resources/venus/bootstrap.js"
s=target.read_text(encoding="utf-8")
if 'key:"questDetails:"+item.id' in s:
    print("Quest details already polished")
    raise SystemExit(0)
old='''            if (Row) return el(Row,{key:"qd:"+item.id,label:item.name,subLabel:opened?sub+"\\n"+details:sub,
                arrow:true,onPress:()=>setExpanded(opened?null:item.id)});
            return el(RN.Pressable,{key:item.id,onPress:()=>setExpanded(opened?null:item.id),style:{padding:12}},
                el(RN.Text,{style:{color:"#ffffff",fontWeight:"600"}},item.name),
                el(RN.Text,{style:{color:"#b9bbbe"}},sub+(opened?"\\n"+details:"")));
'''
new='''            const detailsPanel=opened ? el(RN.View,{key:"questDetails:"+item.id,
                style:{paddingHorizontal:16,paddingVertical:12,borderRadius:12,backgroundColor:"#282a31",gap:8}},
                el(RN.Text,{selectable:true,style:{color:"#d9dce4",fontSize:13,lineHeight:20}},details),
                item.enrolled&&!item.completed?el(VenusProgress,{key:"questProgress:"+item.id,value:item.progress}):null) : null;
            if (Row) return el(RN.View,{key:"qd:"+item.id},
                el(Row,{label:item.name,subLabel:sub,arrow:true,onPress:()=>setExpanded(opened?null:item.id)}),
                detailsPanel);
            return el(RN.View,{key:item.id},
                el(RN.Pressable,{onPress:()=>setExpanded(opened?null:item.id),style:{padding:12}},
                    el(RN.Text,{style:{color:"#ffffff",fontWeight:"600"}},item.name),
                    el(RN.Text,{style:{color:"#b9bbbe"}},sub)),detailsPanel);
'''
if s.count(old)!=1:raise RuntimeError(f"Quest row anchor mismatch: {s.count(old)}")
s=s.replace(old,new)
target.write_text(s,encoding="utf-8")
print("Quest details now render as a separate panel.")
