/** Keep the Corsaire interface and its live mission intact while a company owns the screen. */
export function mountCompanyMode(app:HTMLElement,root:HTMLElement):()=>void {
 const previous=[...app.children].filter((node):node is HTMLElement=>node instanceof HTMLElement&&node.id!=='game-menu').map(node=>({node,hidden:node.hidden,inert:node.inert}));
 const exploring=app.classList.contains('exploring');app.classList.remove('exploring');
 for(const {node} of previous){node.hidden=true;node.inert=true;}
 app.append(root);app.dataset.company='brittany';
 let disposed=false;return ()=>{if(disposed)return;disposed=true;root.remove();for(const {node,hidden,inert} of previous){node.hidden=hidden;node.inert=inert;}app.classList.toggle('exploring',exploring);delete app.dataset.company;};
}
